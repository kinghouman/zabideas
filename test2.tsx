Visual Studio Code 1.133

Show release notes after an update

Follow us on LinkedIn, X, Bluesky | View online

Release date: August 12, 2026

Welcome to the 1.133 release of Visual Studio Code. This release gives you more flexibility in Claude sessions, keeps long chats easier to follow, and refreshes local HTML previews as you work.

Change model provider for Claude sessions: Switch providers between turns without reconfiguring the agent host.

Agents window without GitHub sign-in: Use Claude with your existing API key when GitHub sign-in is unavailable.

Auto-reload HTML files: Preview HTML changes immediately without manual refresh.

Happy Coding!

VS Code is rolling out gradually to all users. Use Check for Updates in VS Code to get the latest version immediately.

To try new features as soon as possible, download the nightly Insiders build, which includes the latest updates as soon as they are available.

In this update
Agents
Chat
Editor Experience
Deprecated features and settings
Thank you
Agents
Agent host
The agent host lets you connect to the same agent session from multiple VS Code windows. It runs agent harnesses in a dedicated process based on the Agent Host Protocol (AHP). The agent host's Copilot agent is powered by the Copilot SDK, which aligns its behavior and functionality with the Copilot CLI, the standalone GitHub Copilot app, and other Copilot products.

We're actively developing the agent host. The screenshot below shows how to select the Copilot harness on the agent host in the editor window:

Screenshot showing the harness dropdown in the editor window.

You can learn more in our VS Code Agent Host documentation. If you have any feedback or requests, please let us know by filing an issue.

Mix Anthropic and Copilot models in Claude sessions
Previously, a Claude session ran entirely through either your GitHub Copilot subscription or Claude's existing configuration, such as an API key. Switching providers required reconfiguring the agent host.

Now, the model picker displays both groups, so you can switch providers between turns. The model you select is used for the next turn. Models under Anthropic bill your API key, and models under Copilot use your Copilot subscription.

Screenshot showing the model picker in a Claude session, with models grouped under an Anthropic heading and a Copilot heading.

Open the Agents window without GitHub sign-in (Experimental)
Setting:   chat.agentHost.allowSignedOutWhenUsable

The Agents window used to open with a GitHub sign-in prompt you could not dismiss. That blocked anyone whose machine can't reach github.com or anyone who doesn't interact with GitHub. Users with Claude already configured with an API key who don't need GitHub sign-in had this extra step.

Enable this setting to open the Agents window without signing in to GitHub. GitHub authentication is then associated with individual agents or models instead of the Agents window. In this release, this behavior only supports Claude. Support for Copilot with your own model keys and Codex is planned for future releases.

Screenshot showing the Agents window opened while signed out of GitHub, with a notification that reads "We've discovered your existing Claude configuration" and a Sign in to GitHub button.

Chat
Sticky scroll for prompts
Setting:   chat.stickyScroll.enabled

When you scroll through a long conversation, you can lose track of which prompt a response belongs to. The prompt you have scrolled past now stays pinned to the top of the chat, similar to sticky scroll in the editor.

The pinned prompt shows its position in the conversation. Select it to jump back to that prompt, or use the previous and next buttons beside it to step through your prompts.


Editor Experience
Auto-reload HTML files in the integrated browser
Setting:   workbench.browser.autoReloadOnFileChange

When a local HTML file is open in the integrated browser, it now refreshes automatically when the file changes on disk.

This helps you see agent edits or your own saved changes immediately. You can toggle automatic reload for individual browser tabs and configure the default with the   workbench.browser.autoReloadOnFileChange setting.


Deprecated features and settings
None

Thank you
Contributions to vscode:

@accnops (Arthur Cnops)
voice: explain why a voice connection failed PR #329453
Rename Voice Mode voices to approved names PR #329576
@benelog (Sanghyuk Jung): Fix duplicated word in notebook.cellToolbarLocation setting description PR #328957
@Bosphoramus (Tony): fix: add top gap for Modern UI floating panels when title bar is hidden PR #328688
@bstee615 (Benjamin Steenhoek): Add optional rejected edit memory to diffpatch prompt PR #327367
@karthikkatu (Karthikeyan M): Auto-reload Integrated Browser when previewed local file changes PR #324618
@lfraleigh (Lori Fraleigh): Add missing Azure SDK for Go modules to GoModulesToLookFor PR #322786
@mateusabelli (Mateus Abelli): Update Copilot extension links PR #329229
@rfeltis (Ralph Feltis): Add Agents window startup A/A experiment trigger PR #328454
@ShehabSherif0 (Shehab Sherif): Fix operator precedence in timeline pageSize calculation PR #303258
@SimonSiefke (Simon Siefke): fix: memory leak in PerfModelContentProvider PR #328581
@SVOG23 (Suraj Vaghela): docs: fix stale relative paths in Claude chat sessions AGENTS.md PR #327612
@vscodebot-pr (VS Code PR Bot): fix: guard against stale line numbers in test decorations (fixes #328988) PR #328994
@Xaena53 (Bedirhan ÇETİN): refactor: share the find input toggle navigation PR #329128
Issue tracking
Contributions to our issue tracking:

@gjsjohnmurray (John Murray)
@RedCMD (RedCMD)
@IllusionMH (Andrii Dieiev)
@albertosantini (Alberto Santini)
We really appreciate people trying our new features as soon as they are ready, so check back here often and learn what's new.

If you'd like to read release notes for previous VS Code versions, go to Updates on code.visualstudio.com.

