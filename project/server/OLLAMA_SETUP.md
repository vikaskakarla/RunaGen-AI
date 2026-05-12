# Ollama Setup Guide

This guide explains how to set up and use Ollama as the primary AI service for RunaGen AI with automatic fallback to OpenRouter API keys.

## What is Ollama?

Ollama is a local AI model runner that lets you run large language models on your own machine. It's:
- **Free** - No API costs
- **Fast** - Runs locally on your machine
- **Private** - Your data never leaves your computer
- **Offline** - Works without internet connection

## Installation

### macOS

Ollama is already installed on your system (version 0.15.4).

To verify:
```bash
ollama --version
```

### Download Models

The system uses `deepseek-r1:7b` by default. To download it:

```bash
ollama pull deepseek-r1:7b
```

Other recommended DeepSeek models:
```bash
# Larger, more capable model
ollama pull deepseek-r1:14b

# Faster, smaller model
ollama pull deepseek-r1:1.5b

# Latest V3 model (very large)
ollama pull deepseek-v3
```

## Running Ollama

### Option 1: Run as a service (recommended)
```bash
ollama serve
```

This keeps Ollama running in the background.

### Option 2: Run a specific model
```bash
ollama run deepseek-r1:7b
```

This starts Ollama and opens an interactive chat. You can exit the chat (Ctrl+D) and Ollama will keep running.

## Verifying Ollama is Running

Check if Ollama is available:
```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response with your installed models.

## Fallback Chain

The application uses an intelligent fallback system:

1. **Primary: Ollama (Local)**
   - Tries Ollama first if it's running
   - Fast and free
   - No API costs

2. **Secondary: OpenRouter API Key 1**
   - Falls back if Ollama is unavailable
   - Uses your first OpenRouter API key
   - Model: `tngtech/deepseek-r1t2-chimera:free`

3. **Tertiary: OpenRouter API Key 2**
   - Final fallback option
   - Uses your second OpenRouter API key
   - Model: `google/gemini-2.0-flash-exp:free`

### Sticky Fallback

If a fallback provider succeeds, the system will "stick" to it for 10 minutes to avoid repeatedly checking failed providers.

## Configuration

Edit `/project/server/.env`:

```env
# Ollama Configuration (Primary)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_NAME=deepseek-r1:7b

# OpenRouter Fallbacks (already configured)
OPENROUTER_API_KEY=your-key-1
OPENROUTER_MODEL_NAME=tngtech/deepseek-r1t2-chimera:free
OPENROUTER_API_KEY2=your-key-2
OPENROUTER_MODEL_NAME2=google/gemini-2.0-flash-exp:free
```

## Testing

### Test Ollama Connection
```bash
cd /Users/sujithputta/Projects/RunaGen-AI-Prototype-main/project/server
node test-ollama.js
```

### Test Fallback Chain
```bash
node test-unified-client.js
```

### Test All Services
```bash
node test-services.js
```

## Monitoring

Watch the server logs to see which provider is being used:

- `🤖 Ollama: Generating content...` - Using Ollama
- `OpenRouter: Sending request [PRIMARY]...` - Using OpenRouter Key 1
- `OpenRouter: Sending request [KEY-FALLBACK]...` - Using OpenRouter Key 2

## Troubleshooting

### Ollama not responding

**Problem:** `Ollama is not available`

**Solution:**
```bash
# Start Ollama
ollama serve

# Or run a model directly
ollama run deepseek-r1:7b
```

### Model not found

**Problem:** `model 'deepseek-r1:7b' not found`

**Solution:**
```bash
# Download the model
ollama pull deepseek-r1:7b

# List installed models
ollama list
```

### Slow responses

**Problem:** Ollama is slow on your machine

**Solution:**
1. Use a smaller model: `OLLAMA_MODEL_NAME=deepseek-r1:1.5b`
2. Let it fallback to OpenRouter (cloud-based, faster)
3. Upgrade your hardware (Ollama benefits from more RAM and GPU)

### All providers failing

**Problem:** Both Ollama and OpenRouter are failing

**Solution:**
1. Check Ollama: `curl http://localhost:11434/api/tags`
2. Check OpenRouter API keys in `.env`
3. Check internet connection for OpenRouter
4. Review server logs for specific errors

## Best Practices

1. **Keep Ollama running** - Start `ollama serve` when you boot your computer
2. **Monitor logs** - Watch which provider is being used
3. **Use appropriate models** - Smaller models for speed, larger for quality
4. **Test fallbacks** - Occasionally stop Ollama to verify fallback works

## Changing Models

To use a different DeepSeek model:

1. Pull the model:
   ```bash
   ollama pull deepseek-r1:14b
   ```

2. Update `.env`:
   ```env
   OLLAMA_MODEL_NAME=deepseek-r1:14b
   ```

3. Restart your server

## Performance Tips

- **RAM**: Ollama needs 4-8GB RAM for deepseek-r1:7b
- **GPU**: NVIDIA/AMD GPUs significantly speed up generation
- **Model size**: Smaller models (1b, 3b) are faster but less capable
- **Context length**: Reduce `maxOutputTokens` for faster responses

## Support

For Ollama-specific issues:
- Documentation: https://ollama.ai/docs
- GitHub: https://github.com/ollama/ollama

For RunaGen AI integration issues:
- Check server logs
- Run test scripts
- Verify environment configuration
