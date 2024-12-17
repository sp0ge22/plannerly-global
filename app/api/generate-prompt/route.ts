import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { text, type } = await request.json()

    if (!text || !type) {
      return NextResponse.json({ error: 'Text and type are required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: `You are an expert at creating email handling instructions. The user will describe what kind of email prompt they want, and you will generate:
1. A clear, concise title for the instruction set
2. A helpful description explaining what these instructions are for. Keep this short and concise.
3. The actual instructions that will guide the AI in how to ${type === 'response' ? 'respond to' : 'rewrite'} an email

Your response should be in JSON format with these fields:
{
  "title": "The instruction set title",
  "description": "A brief description of what these instructions do",
  "prompt": "Detailed instructions for how to handle the email, including tone, style, key points to address, and any specific requirements. For response prompts, explain how to analyze the incoming email and craft an appropriate response. For rewrite prompts, explain how to improve and modify the email content."
}

Make the instructions detailed and effective, focusing on HOW to handle the email rather than providing a template response.
For example, instead of "Here's a polite rejection email...", write "When responding to vendor inquiries, maintain a professional tone, acknowledge their specific offering, express gratitude for their interest, and clearly but politely explain the rejection reason..."` 
        },
        { role: "user", content: text }
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
    console.error('Error generating prompt:', error)
    return NextResponse.json({ error: 'An error occurred while generating the prompt' }, { status: 500 })
  }
} 