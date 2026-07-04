// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import http from "http";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	
	console.error('Congratulations, your extension "backend" is now active!');

	let proposedContent = ""
	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider("proposed", {
			provideTextDocumentContent: () => proposedContent
		})
	)

	const disposable = vscode.commands.registerCommand('connect', () => {
		vscode.window.showInformationMessage('Hello World from backend!');
	});


	const buildServer = () => {
		const server = new McpServer({name: "VSCP", version: "1.0.0"});

		server.registerTool(
			 "showDiff",
			 {
				description: "Shows the diff viewer for a proposed change in vscode",
				inputSchema: {
					filePath:
						z.string()
						.describe("File path of the original file"),
					change:
						z.string()
						.describe("Proposed content change")
				}
			 },
			 async ({filePath,change}) => {
				let original = vscode.Uri.file(filePath);
				let proposed = original.with({scheme: "proposed"});
				proposedContent = change
				

				await vscode.commands.executeCommand("vscode.diff", original,proposed);

				return {
					content: [{ type: "text", text: `Success!`}]
				}


			 }
		);

		return server;
	};

	// Stateless mode: each HTTP request gets its own server + transport pair,
	// torn down when the response closes.
	const httpServer = http.createServer(async (req, res) => {
		const server = buildServer();
		const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined});

		res.on("close", () => {
			transport.close();
			server.close();
		});

		await server.connect(transport);
		await transport.handleRequest(req, res);
	})

	httpServer.listen(3000);

	context.subscriptions.push(disposable);
	context.subscriptions.push(new vscode.Disposable(
		() => {
			httpServer.close()
		}
	))


}

// This method is called when your extension is deactivated
export function deactivate() {
	console.error("done")
}
