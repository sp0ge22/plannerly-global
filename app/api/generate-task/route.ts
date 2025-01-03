import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

// Add interface for organization user
interface OrgUser {
  user_id: string;
  profile: {
    name?: string;
    email?: string;
  };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { description, tenant_id, orgUsers } = await request.json()

    if (!description || !tenant_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use the OrgUser type for mapping
    const availableAssignees = (orgUsers as OrgUser[]).map(user => 
      user.profile.name || user.profile.email || user.user_id
    ).join(', ')

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a task creation assistant. You analyze task descriptions and extract key information to create structured tasks.
          Available assignees are: ${availableAssignees}
          
          For each field:
          - If you can confidently determine the value, provide it
          - If you cannot determine the value, return "incomplete"
          - For assignee, only use names from the available assignees list
          - For priority, use only: "Low", "Medium", or "High"
          - For status, use only: "To Do", "In Progress", or "Completed"
          
          Return a JSON object with:
          {
            "title": "Brief, clear task title",
            "body": "Detailed task description. Do not include the assignees name in the body. Use formatting to make it more readable.",
            "assignee": "Name from available assignees or 'incomplete'",
            "priority": "Priority level or 'incomplete'",
            "status": "Status or 'incomplete'",
            "due": "ISO date string or 'incomplete'",
            "missing_fields": ["List of fields marked incomplete"]
          }`
        },
        {
          role: "user",
          content: description
        }
      ]
    })

    const response = completion.choices[0].message.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    return NextResponse.json(JSON.parse(response))
  } catch (error) {
    console.error('Error generating task:', error)
    return NextResponse.json({ error: 'Failed to generate task' }, { status: 500 })
  }
} 