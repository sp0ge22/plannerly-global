import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { currentPrompt, instruction, type } = await request.json()

    if (!currentPrompt || !instruction || !type) {
      return NextResponse.json({ error: 'Current prompt, instruction, and type are required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: `You are an expert at editing email handling instructions. You will be given a current set of instructions and a request for how to modify them.
Your task is to edit the instructions according to the request while maintaining their effectiveness.

You should return:
1. An updated title if the changes warrant it
2. An updated description explaining what these instructions are for
3. The modified instructions that will guide the AI in how to ${type === 'response' ? 'respond to' : 'rewrite'} an email

Your response should be in JSON format with these fields:
{
  "title": "The updated instruction set title",
  "description": "A brief description of what these instructions do",
  "prompt": "Detailed instructions for how to handle the email, including tone, style, key points to address, and any specific requirements. For response prompts, explain how to analyze the incoming email and craft an appropriate response. For rewrite prompts, explain how to improve and modify the email content."
}

Make sure the edited instructions remain detailed and effective, focusing on HOW to handle the email rather than providing a template response.
The instructions should guide the AI in understanding and handling the email appropriately.` 
        },
        { 
          role: "user", 
          content: `Current prompt:
Title: ${currentPrompt.title}
Description: ${currentPrompt.description || 'No description'}
Prompt: ${currentPrompt.prompt}

Instruction: ${instruction}`
        }
      ],
      max_tokens: 800,
      response_format: { type: "json_object" }
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content received from OpenAI')
    }
    
    const data = JSON.parse(content)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error editing prompt:', error)
    return NextResponse.json({ error: 'An error occurred while editing the prompt' }, { status: 500 })
  }
} 