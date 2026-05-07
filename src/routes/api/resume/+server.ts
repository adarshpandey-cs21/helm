import { error, json } from '@sveltejs/kit';
import { execSync, spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { getSession } from '$lib/server/history';
import type { RequestHandler } from './$types';

const SAFE_SESSION_ID = /^[A-Za-z0-9_-]+$/;
type Term = 'iterm' | 'terminal' | 'warp' | 'copy';

export const POST: RequestHandler = async ({ request }) => {
	let body: {
		projectId?: unknown;
		sessionId?: unknown;
		terminal?: unknown;
		warpMode?: unknown;
	};
	try {
		body = await request.json();
	} catch {
		throw error(400, 'invalid JSON body');
	}

	const projectId = typeof body.projectId === 'string' ? body.projectId : '';
	const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
	const requestedTerm = typeof body.terminal === 'string' ? body.terminal.toLowerCase() : 'auto';
	const warpMode: 'window' | 'tab' =
		body.warpMode === 'tab' ? 'tab' : 'window';

	if (!projectId || !sessionId || !SAFE_SESSION_ID.test(sessionId)) {
		throw error(400, 'projectId and a safe sessionId are required');
	}

	const session = await getSession(projectId, sessionId);
	if (!session) throw error(404, 'session not found');

	const cwd = session.cwd?.trim();
	if (!cwd || !cwd.startsWith('/')) {
		throw error(400, 'session is missing a usable cwd');
	}

	const fullCommand = `cd ${shQuote(cwd)} && claude --resume ${sessionId}`;
	const inlineCommand = `claude --resume ${sessionId}`;

	// Copy mode: don't launch anything. Just return the command for clipboard.
	if (requestedTerm === 'copy') {
		return json({ ok: true, opened: false, command: fullCommand });
	}

	if (platform() !== 'darwin') {
		return json({ ok: true, opened: false, command: fullCommand });
	}

	const term = resolveTerm(requestedTerm);
	try {
		if (term === 'iterm') {
			openInITerm(cwd, sessionId);
			return json({ ok: true, opened: true, terminal: term, command: fullCommand });
		}
		if (term === 'warp') {
			if (warpMode === 'tab') {
				openInWarpTab(cwd, sessionId);
				// Keystroke may silently fail if Accessibility isn't granted —
				// the client copies the inline command as a fallback.
				return json({
					ok: true,
					opened: true,
					terminal: term,
					warpMode,
					mayNeedClipboard: true,
					command: inlineCommand
				});
			}
			await openInWarpWindow(cwd, sessionId);
			return json({ ok: true, opened: true, terminal: term, warpMode, command: fullCommand });
		}
		openInMacTerminal(cwd, sessionId);
		return json({ ok: true, opened: true, terminal: term, command: fullCommand });
	} catch (e) {
		return json({ ok: true, opened: false, command: fullCommand, error: String(e) });
	}
};

function resolveTerm(requested: string): Exclude<Term, 'copy'> {
	if (requested === 'iterm' || requested === 'iterm2') return 'iterm';
	if (requested === 'warp') return 'warp';
	return 'terminal';
}

function shQuote(s: string): string {
	return `'${s.replace(/'/g, `'\\''`)}'`;
}

function applescriptQuote(s: string): string {
	return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function yamlString(s: string): string {
	return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function runOsascript(script: string) {
	const child = spawn('osascript', ['-e', script], {
		detached: true,
		stdio: 'ignore'
	});
	child.unref();
}

function openInMacTerminal(cwd: string, sessionId: string) {
	const inner = `cd ${shQuote(cwd)} && clear && claude --resume ${sessionId}`;
	const script = `tell application "Terminal"
	activate
	do script ${applescriptQuote(inner)}
	delay 0.05
	try
		tell front window
			set bounds to {120, 80, 1400, 920}
		end tell
	end try
	set frontmost to true
end tell`;
	runOsascript(script);
}

function openInITerm(cwd: string, sessionId: string) {
	const inner = `cd ${shQuote(cwd)} && clear && claude --resume ${sessionId}`;
	const script = `tell application "iTerm"
	activate
	set newWindow to (create window with default profile)
	tell current session of newWindow
		write text ${applescriptQuote(inner)}
	end tell
end tell`;
	runOsascript(script);
}

async function openInWarpWindow(cwd: string, sessionId: string) {
	// Default Warp mode: write a Launch Configuration YAML and trigger it via
	// `warp://launch/<name>`. Warp itself opens a new window at the cwd and
	// auto-runs the command. No Accessibility permission required.
	const dir = join(homedir(), '.warp', 'launch_configurations');
	await mkdir(dir, { recursive: true });
	const configName = 'helm-resume';
	const configPath = join(dir, `${configName}.yaml`);
	const yaml = `---
name: ${yamlString(configName)}
windows:
  - tabs:
      - layout:
          cwd: ${yamlString(cwd)}
          commands:
            - exec: ${yamlString(`claude --resume ${sessionId}`)}
`;
	await writeFile(configPath, yaml, 'utf8');
	const child = spawn('open', [`warp://launch/${configName}`], {
		detached: true,
		stdio: 'ignore'
	});
	child.unref();
}

function openInWarpTab(cwd: string, sessionId: string) {
	// Opt-in mode: open a tab in the active Warp window via URL, then send
	// a System Events keystroke to type & run the command. Requires macOS
	// Accessibility permission for whichever process spawned `pnpm dev`.
	const url = `warp://action/new_tab?path=${encodeURIComponent(cwd)}`;
	const command = `claude --resume ${sessionId}`;
	const warmDelay = isProcessRunning('Warp') ? 0.6 : 1.6;
	const script = `do shell script "open " & quoted form of "${url}"
delay ${warmDelay}
tell application "Warp" to activate
delay 0.15
tell application "System Events"
	keystroke ${applescriptQuote(command)}
	delay 0.05
	key code 36
end tell`;
	runOsascript(script);
}

function isProcessRunning(name: string): boolean {
	try {
		execSync(`pgrep -x ${JSON.stringify(name)}`, { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}
