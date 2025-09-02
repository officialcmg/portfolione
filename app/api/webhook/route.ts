import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log webhook events for debugging
    console.log('Webhook received:', {
      timestamp: new Date().toISOString(),
      body
    });
    
    // Handle different webhook event types
    switch (body.type) {
      case 'frame_added':
        console.log('Frame added to user collection');
        break;
      case 'frame_removed':
        console.log('Frame removed from user collection');
        break;
      case 'notifications_enabled':
        console.log('User enabled notifications');
        break;
      case 'notifications_disabled':
        console.log('User disabled notifications');
        break;
      default:
        console.log('Unknown webhook event type:', body.type);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'Portfolione webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}