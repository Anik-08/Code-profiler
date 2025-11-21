# Troubleshooting Guide - Code Energy Profiler

## "Command not found" Error

**Problem:** When you run commands like "Code Energy Profiler: Analyze Current File" in VS Code, you get "command not found" or the commands don't appear in the Command Palette.

**Cause:** The extension hasn't been built yet. The TypeScript code needs to be compiled to JavaScript before VS Code can load it.

**Solution:**

```bash
# 1. Install dependencies
npm install

# 2. Build the extension
npm run build

# 3. Launch Extension Development Host
# In VS Code: Press F5
# Or: Run → Start Debugging
```

**Verify the fix:**
```bash
# Check if out/ directory exists
ls out/

# Should show compiled JavaScript files
# If empty or missing, run npm run build again
```

## Extension Not Loading in VS Code

**Problem:** Commands still don't appear after building.

**Solutions:**

1. **Make sure you're in Extension Development Host:**
   - Press `F5` in VS Code to launch a new window
   - The new window has "[Extension Development Host]" in the title
   - Only in this window will the extension be active

2. **Check the Output panel:**
   - View → Output
   - Select "Code Energy Profiler" from dropdown
   - Look for errors or activation messages

3. **Restart the Extension Development Host:**
   - Close the Extension Development Host window
   - Press `F5` again in the main VS Code window

4. **Rebuild from scratch:**
   ```bash
   rm -rf out/
   npm run build
   ```

## TypeScript Compilation Errors

**Problem:** `npm run build` shows errors.

**Solution:**

```bash
# Clean and reinstall
rm -rf node_modules package-lock.json out/
npm install
npm run build
```

## Node Modules Missing

**Problem:** Errors about missing modules like `vscode`, `tree-sitter`, etc.

**Solution:**

```bash
npm install
```

## Python/ML Model Issues

**Problem:** ML model not loading or training fails.

**Solution:**

```bash
# Install Python dependencies
cd api
pip install -r requirements.txt
cd ..

# Train model
cd ml
python generate_synthetic_dataset.py
python train_model.py
python export_onnx.py
cd ..

# Verify model exists
ls model_artifacts/energy_model.onnx
ls ml/energy_model.pkl
```

## Extension Not Analyzing Code

**Problem:** Open a Python/JS file but no hotspots appear.

**Checks:**

1. **Is the file language supported?**
   - Python (.py)
   - JavaScript (.js)
   - TypeScript (.ts)
   - Java (.java)

2. **Does the code have inefficient patterns?**
   - Try opening `examples/sample_inefficient.py`
   - Should show multiple hotspots

3. **Is the extension activated?**
   - Check Output panel (View → Output → "Code Energy Profiler")
   - Should see activation messages

4. **Try manual analysis:**
   - Command Palette (Cmd/Ctrl+Shift+P)
   - Run: "Code Energy Profiler: Analyze Current File"

## API Server Issues

**Problem:** Remote API not working.

**Solutions:**

1. **Check if server is running:**
   ```bash
   curl http://localhost:8080/health
   ```

2. **Start the server:**
   ```bash
   cd api
   uvicorn server:app --reload --port 8080
   ```

3. **Check extension settings:**
   - Settings → Extensions → Code Energy Profiler
   - `localOnly` should be `false` to use remote API
   - `remoteEndpoint` should be correct URL

## Performance Issues

**Problem:** Analysis is slow or freezes VS Code.

**Solutions:**

1. **Increase debounce time:**
   - Settings → `codeEnergyProfiler.debounceMs`
   - Set to 1000 or higher

2. **Use local-only mode:**
   - Settings → `codeEnergyProfiler.localOnly` = true

3. **Clear cache:**
   - Restart VS Code
   - Cache is in-memory only

## Commands from Command Palette

Can't find commands? Make sure you:

1. **Built the extension:** `npm run build`
2. **Launched Extension Development Host:** Press `F5`
3. **Type the full command name:** "Code Energy Profiler:"

Available commands:
- `Code Energy Profiler: Analyze Current File`
- `Code Energy Profiler: Show Energy Summary`
- `Code Energy Profiler: Toggle Local-only Mode`

## Using Tasks in VS Code

You can use VS Code tasks for common operations:

1. **Open Command Palette:** `Cmd/Ctrl+Shift+P`
2. **Run:** "Tasks: Run Task"
3. **Select:**
   - "Setup Extension" - Install deps and build
   - "npm: build" - Build TypeScript
   - "npm: watch" - Auto-rebuild on changes
   - "Train ML Model" - Train the model

## Codespaces Specific Issues

**Problem:** Extension not working in GitHub Codespaces.

**Solutions:**

1. **Run setup after codespace starts:**
   ```bash
   ./setup.sh
   ```

2. **Check if dependencies installed:**
   ```bash
   ls node_modules/
   ls out/
   ```

3. **Rebuild if needed:**
   ```bash
   npm install
   npm run build
   ```

4. **Use Extension Development Host:**
   - In Codespaces, press `F5` to launch
   - This opens a new VS Code window with the extension

## Getting Help

If none of these solutions work:

1. **Check the logs:**
   - Output panel: "Code Energy Profiler"
   - Debug Console (when running Extension Development Host)

2. **Verify setup:**
   ```bash
   ./setup.sh
   ```

3. **Check file structure:**
   ```bash
   ls -la out/
   ls -la model_artifacts/
   ls -la ml/
   ```

4. **File an issue:**
   - Include error messages
   - Include output from `npm run build`
   - Include VS Code version and OS

## Quick Reference

```bash
# First time setup
npm install && npm run build

# Regular development
npm run watch  # Auto-rebuild on changes

# Launch extension
# Press F5 in VS Code

# Train ML model
cd ml && python train_model.py && python export_onnx.py

# Start API server (optional)
uvicorn api.server:app --port 8080
```
