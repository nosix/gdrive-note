const chatPattern = /(assistant|user):\s{2,}([\s\S]*?)(?=(assistant|user):|$)/g;

export function createChatRequestBody(prompt, config) {
    const messages = [];
    if (config.getGptSystemMessage()) {
        messages.push({role: 'system', content: config.getGptSystemMessage()});
    }

    let match;
    const result = [];
    while ((match = chatPattern.exec(prompt)) !== null) {
        result.push([match[1], match[2].trim()]);
    }

    if (result.length !== 0) {
        for (const [role, content] of result) {
            messages.push({role: role, content: content});
        }
    } else {
        messages.push({role: 'user', content: prompt});
    }

    return {
        model: config.getGptModel(),
        max_tokens: config.getGptMaxTokens(),
        temperature: config.getGptTemperature(),
        top_p: config.getGptTopP(),
        messages: messages,
    };
}