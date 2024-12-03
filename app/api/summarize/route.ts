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
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "The user has provided you with some scattered notes for instructions for a task. Improve these instructions.Use good spacing and very simple formatting. Do not include a title. Don't write it out as steps. Just use the information provided to create a concise and easy to read task brief." },
        { role: "user", content: text }
      ],
      max_tokens: 500,
    })

    const summary = completion.choices[0].message.content

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Error summarizing text:', error)
    return NextResponse.json({ error: 'An error occurred while summarizing the text' }, { status: 500 })
  }
}
