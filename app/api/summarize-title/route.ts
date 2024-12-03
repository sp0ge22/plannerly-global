import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "Generate a brief, clear title (maximum 8 words) that captures the main point of this text. The title should be in title case and should not end with punctuation." 
        },
        { role: "user", content: text }
      ],
      max_tokens: 50,
    })

    const summary = completion.choices[0].message.content

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Error generating title:', error)
    return NextResponse.json({ error: 'An error occurred while generating the title' }, { status: 500 })
  }
}
