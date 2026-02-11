import webpush from 'web-push'

const vapidKeys = webpush.generateVAPIDKeys()

console.log('VAPID Keys Generated:')
console.log('')
console.log('Add these to Doppler and Vercel environment variables:')
console.log('')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)
console.log(`VAPID_CONTACT_EMAIL=mailto:hello@linkparty.app`)
