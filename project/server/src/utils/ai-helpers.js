/**
 * Attempts to repair truncated JSON by closing open brackets and quotes.
 */
const repairTruncatedJson = (json) => {
    if (!json || typeof json !== 'string') return json;

    let repaired = json.trim();
    let inString = false;
    let escaped = false;
    const stack = [];

    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];

        if (char === '"' && !escaped) {
            inString = !inString;
        } else if (char === '\\' && inString) {
            escaped = !escaped;
        } else {
            escaped = false;
        }

        if (!inString) {
            if (char === '{' || char === '[') {
                stack.push(char);
            } else if (char === '}') {
                if (stack[stack.length - 1] === '{') stack.pop();
            } else if (char === ']') {
                if (stack[stack.length - 1] === '[') stack.pop();
            }
        }
    }

    // 1. Close unclosed string
    if (inString) {
        repaired += '"';
    }

    // 2. Remove trailing comma/punctuation before closing
    repaired = repaired.replace(/[,:\s]+$/, '');

    // 3. Balance brackets/braces
    while (stack.length > 0) {
        const last = stack.pop();
        if (last === '{') repaired += '}';
        else if (last === '[') repaired += ']';
    }

    return repaired;
};

/**
 * Robustly parse JSON that might be wrapped in markdown code blocks
 * or contain common formatting issues from AI models.
 */
export const safeJsonParse = (text, fallback = null) => {
    if (!text || typeof text !== 'string') return fallback;

    try {
        // First attempt: Direct parse (most efficient)
        return JSON.parse(text);
    } catch (e) {
        // Second attempt: Strip markdown, thinking tags, and try again
        try {
            let cleaned = text.trim();

            // 1. Remove thinking tags (Deepseek R1)
            if (cleaned.includes('<think>')) {
                cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            }

            // 2. Remove markdown code blocks if present
            if (cleaned.includes('```')) {
                cleaned = cleaned.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
            }

            // Find the first { or [ and last } or ]
            const firstCurly = cleaned.indexOf('{');
            const firstBracket = cleaned.indexOf('[');
            let start = -1;
            let end = -1;

            if (firstCurly !== -1 && (firstBracket === -1 || firstCurly < firstBracket)) {
                start = firstCurly;
                end = cleaned.lastIndexOf('}');
            } else if (firstBracket !== -1) {
                start = firstBracket;
                end = cleaned.lastIndexOf(']');
            }

            if (start !== -1 && end !== -1 && end > start) {
                cleaned = cleaned.substring(start, end + 1);
            }

            // High-frequency fix: if we expect a 'simulation' or 'roadmap' root but got something else, try to find that specific key
            if (cleaned.length > 10 && !cleaned.includes('"simulation"') && !cleaned.includes('"roadmap"')) {
                const simIndex = text.indexOf('"simulation"');
                const roadIndex = text.indexOf('"roadmap"');
                const targetIndex = (simIndex !== -1 && (roadIndex === -1 || simIndex < roadIndex)) ? simIndex : roadIndex;

                if (targetIndex !== -1) {
                    const blockStart = text.lastIndexOf('{', targetIndex);
                    if (blockStart !== -1) {
                        const blockEnd = text.lastIndexOf('}');
                        if (blockEnd > blockStart) {
                            cleaned = text.substring(blockStart, blockEnd + 1);
                        }
                    }
                }
            }

            // Attempt to repair if first pass fails
            let finalOutput;
            try {
                // Final sanitization for common AI issues
                const sanitized = cleaned
                    .replace(/,(\s*[}\]])/g, '$1') // Trailing commas
                    .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Unquoted keys (basic)
                    .replace(/\\n/g, ' ') // Replace raw newlines with spaces in values
                    .replace(/\n/g, ' '); // Replace actual newlines
                finalOutput = JSON.parse(sanitized);
            } catch (e) {
                // If it still fails, try the heavy-duty repair
                const repaired = repairTruncatedJson(cleaned);
                const sanitizedRepaired = repaired
                    .replace(/,(\s*[}\]])/g, '$1')
                    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
                    .replace(/\\n/g, ' ')
                    .replace(/\n/g, ' ');

                try {
                    finalOutput = JSON.parse(sanitizedRepaired);
                } catch (repairError) {
                    throw repairError; // Re-throw to hit the catch block below
                }
            }

            return finalOutput;
        } catch (parseError) {
            console.error('Final JSON parse stage failed:', parseError.message);
            // console.log('Original Text Snippet:', text.substring(0, 500));
            return fallback;
        }
    }
};
