import * as vscode from 'vscode';
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as nbt from 'prismarine-nbt';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('mac-nbt-editor.readNBT', async () => {
        
        // 1. Open the file selector dialog window
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Open NBT File',
            filters: { 'NBT Files': ['dat', 'mca', 'nbt'] }
        });

        if (!fileUri || fileUri.length === 0) { 
            return; 
        }

        try {
            // FIX 1: Explicitly grab the first item in the array using [0]
            const filePath = fileUri[0].fsPath;
            const fileBuffer = fs.readFileSync(filePath);

            // 2. Automatically unzip and parse standard compressed NBT structures
            nbt.parse(fileBuffer, (error, results) => {
                if (error) {
                    vscode.window.showErrorMessage(`Failed to parse NBT: ${error.message}`);
                    return;
                }

                // FIX 2: Target values directly on the results object (no .parsed wrapper)
                const root = results as any;
                if (root.value && root.value.Data && root.value.Data.value.allowCommands) {
                    root.value.Data.value.allowCommands.value = 1;
                } else if (root.value && root.value.allowCommands) {
                    root.value.allowCommands.value = 1;
                }

                // 4. SERIALIZE BACK TO BINARY: Convert structure back to uncompressed bytes
                const uncompressedBinary = nbt.writeUncompressed(root);

                // 5. COMPRESS VIA GZIP: Match Minecraft's compressed dat layout requirement
                const compressedGzipBuffer = zlib.gzipSync(uncompressedBinary);

                // 6. OVERWRITE DISK FILE: Write the buffer right back into your level.dat
                fs.writeFileSync(filePath, compressedGzipBuffer);

                // 7. Success confirmation message viewable on screen
                vscode.window.showInformationMessage('Successfully turned on cheats (allowCommands = 1) and updated level.dat!');
            });

        } catch (error: any) {
            vscode.window.showErrorMessage(`Error writing data back to disk: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
