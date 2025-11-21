# Setup Instructions for Code Energy Profiler

## Problem: "Command not found" Error

If you see "command not found" when trying to run Code Energy Profiler commands, it's because the extension hasn't been built yet.

## Quick Setup (Required Before First Use)

### Step 1: Install Dependencies

```bash
npm install
```

This will install all Node.js dependencies including TypeScript, VS Code types, and runtime libraries.

### Step 2: Build the Extension

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `out/` directory. The extension needs compiled code to run.

### Step 3: Run the Extension

You have two options:

#### Option A: Extension Development Host (Recommended for Testing)

1. Open this folder in VS Code
2. Press `F5` or click "Run → Start Debugging"
3. A new VS Code window will open with the extension loaded
4. In the new window, open a Python or JavaScript file
5. Commands will now be available in the Command Palette (`Cmd/Ctrl+Shift+P`)

#### Option B: Install as VSIX Package

```bash
# Install vsce if you don't have it
npm install -g @vscode/vsce

# Package the extension
vsce package

# Install the .vsix file
# In VS Code: Extensions → ... menu → Install from VSIX
# Select the generated .vsix file
```

## Verifying the Build

After running `npm run build`, you should see:

```bash
ls out/
# Should show: extension.js, analyzer/, model/, suggestions/, etc.
```

## Training the ML Model (Optional but Recommended)

For full functionality, train the machine learning model:

```bash
cd ml
pip install -r ../api/requirements.txt
python generate_synthetic_dataset.py
python train_model.py
python export_onnx.py
cd ..
```

This creates:
- `ml/energy_model.pkl` - Trained model
- `model_artifacts/energy_model.onnx` - Model for extension

## Testing the Commands

Once built and running:

1. Open Command Palette (`Cmd/Ctrl+Shift+P`)
2. Type "Code Energy Profiler"
3. You should see:
   - Code Energy Profiler: Analyze Current File
   - Code Energy Profiler: Show Energy Summary
   - Code Energy Profiler: Toggle Local-only Mode

## Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### TypeScript compilation errors
```bash
npm run build
# Check for errors in the output
```

### Extension not loading
1. Make sure you pressed `F5` to launch Extension Development Host
2. Check the Debug Console for errors
3. Verify `out/extension.js` exists

### Commands not appearing
1. Restart the Extension Development Host (close the window and press `F5` again)
2. Check if the extension activated (look for "Code Energy Profiler" in Output panel)

## Development Workflow

```bash
# Watch mode - automatically rebuilds on file changes
npm run watch

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Next Steps

After setup:
1. Open `examples/sample_inefficient.py` to see hotspots detected
2. Run "Code Energy Profiler: Show Energy Summary" to see metrics
3. Hover over highlighted code to see suggestions
4. Click lightbulb icons to apply Quick Fixes

See [QUICKSTART.md](QUICKSTART.md) for detailed usage instructions.
