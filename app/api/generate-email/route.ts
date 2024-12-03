import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { text, prompt } = await request.json()

    if (!text || !prompt) {
      return NextResponse.json({ error: 'Text and prompt are required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You are a professional email writer. Write clear, concise, and professional emails." 
        },
        { 
          role: "user", 
          content: `${prompt}\n\n${text}` 
        }
      ],
      max_tokens: 500,
    })

    const content = completion.choices[0].message.content

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error generating email:', error)
    return NextResponse.json({ error: 'An error occurred while generating the email' }, { status: 500 })
  }
} 