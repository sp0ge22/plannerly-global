import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { messages, systemMessage } = await request.json()

    if (!messages || !systemMessage) {
      return NextResponse.json({ error: 'Messages and system message are required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        ...messages.map((msg: { role: 'user' | 'assistant', content: string }) => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      max_tokens: 200,
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'An error occurred while processing the chat' }, { status: 500 })
  }
} 