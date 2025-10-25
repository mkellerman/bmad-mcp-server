#!/usr/bin/env node

import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:4000',
  apiKey: 'sk-test-bmad-1234',
});

console.log('Testing LiteLLM proxy with GitHub Copilot...\n');

try {
  const completion = await client.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'user', content: 'How are you today?' }
    ],
    max_tokens: 100,
    temperature: 0.7,
  });

  console.log('✅ Success!\n');
  console.log('Response:', completion.choices[0].message.content);
  console.log('\nModel:', completion.model);
  console.log('Tokens used:', completion.usage?.total_tokens);
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.data);
  }
}
