# Content Moderation & Delete Feature Setup

## What's New? 🎉

Your chat app now has:
1. **AI-powered NSFW content detection** using AWS Rekognition
2. **Delete buttons** for your own messages (hover to see them!)

## Features

### 🛡️ Content Moderation
- Automatically scans uploaded images for NSFW content
- Blocks inappropriate GIFs before they're posted
- Uses AWS Rekognition AI with 60% confidence threshold
- Deletes blocked files automatically

### 🗑️ Delete Messages
- Hover over your own messages to see the delete button
- Works for text, images, and GIFs
- Real-time deletion synced across all users

## Setup Instructions

### 1. Install Dependencies
```bash
cd GrabzHangout009/GrabzHangout009
npm install
```

### 2. Configure AWS Credentials

You need AWS credentials with Rekognition permissions. Add to your environment:

```bash
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
```

Or create a `.env` file:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 3. AWS IAM Permissions

Your AWS user needs this policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectModerationLabels"
      ],
      "Resource": "*"
    }
  ]
}
```

### 4. Run the App
```bash
npm run dev
```

## How It Works

### Image Upload Flow
1. User uploads image
2. Server reads file buffer
3. AWS Rekognition scans for NSFW content
4. If flagged: file deleted, error returned
5. If clean: file saved, message posted

### GIF Flow
1. User selects GIF from Giphy
2. Server downloads GIF temporarily
3. AWS Rekognition scans first frame
4. If flagged: message blocked
5. If clean: GIF URL posted

### Delete Flow
1. User clicks delete button (only visible on their own messages)
2. DELETE request sent to `/api/messages/:id`
3. Message removed from database
4. WebSocket broadcasts deletion to all users
5. UI updates in real-time

## Cost Considerations

AWS Rekognition pricing (as of 2026):
- First 5,000 images/month: $1.00 per 1,000 images
- After that: $0.80 per 1,000 images

For a small chat app, this should be very affordable!

## Troubleshooting

**"Content blocked: NSFW detected"**
- The AI detected inappropriate content
- Try a different image/GIF

**AWS Credentials Error**
- Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- Verify IAM permissions include Rekognition access

**Delete button not showing**
- You can only delete your own messages
- Hover over the message to reveal the button

## Optional: Disable Moderation

To disable moderation (not recommended), comment out these lines in `server/routes.ts`:

```typescript
// For GIFs (in messages.create route):
// const isNsfw = await moderateGif(input.content);
// if (isNsfw) {
//   return res.status(400).json({ message: "Content blocked: NSFW detected" });
// }

// For images (in uploads.create route):
// const isNsfw = await moderateImage(imageBuffer);
// if (isNsfw) {
//   fs.unlinkSync(req.file.path);
//   return res.status(400).json({ message: "Content blocked: NSFW detected" });
// }
```

## Files Modified

- `server/routes.ts` - Added moderation logic and delete endpoint
- `server/storage.ts` - Added deleteMessage method
- `shared/routes.ts` - Added delete route definition
- `shared/schema.ts` - No changes needed
- `client/src/pages/Home.tsx` - Added delete buttons
- `client/src/hooks/use-messages.ts` - Added useDeleteMessage hook
- `package.json` - Added AWS SDK and axios

Enjoy your safer, more controllable chat! 🚀
