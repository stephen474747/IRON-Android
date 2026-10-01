package com.iron.assistant;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class IronSmsCommandReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context, Intent intent) {
  if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
  try {
   SmsMessage[] parts=Telephony.Sms.Intents.getMessagesFromIntent(intent);
   if(parts==null || parts.length==0) return;
   String sender=parts[0].getOriginatingAddress();
   if(sender==null)return;
   sender=sender.replaceAll("[^0-9+]", "");
   if(sender.startsWith("00"))sender="+"+sender.substring(2);
   if(!sender.startsWith("+") && sender.startsWith("352"))sender="+"+sender;
   if(!sender.equals("+352691211592"))return;
   StringBuilder text=new StringBuilder();
   for(SmsMessage part:parts){if(!parts[0].getOriginatingAddress().equals(part.getOriginatingAddress()))return;text.append(part.getMessageBody());}
   String body=text.toString().trim();
   if(!body.matches("(?is)^IRON\\s+[A-Za-z0-9_-]{4,64}\\s+.{1,160}$"))return;
   long timestamp=parts[0].getTimestampMillis();
   byte[] digest=MessageDigest.getInstance("SHA-256").digest((sender+timestamp+body).getBytes(StandardCharsets.UTF_8));
   StringBuilder hex=new StringBuilder();for(byte b:digest)hex.append(String.format("%02x",b & 255));
   String id="remote_"+hex.substring(0,24);
   android.content.SharedPreferences prefs=context.getSharedPreferences(IronSmsRelayService.PREF,Context.MODE_PRIVATE);
   if(prefs.getString("token", "").isEmpty() || prefs.getAll().size()>100)return;
   JSONObject job=new JSONObject().put("id",id).put("sender",sender).put("text",body).put("received",System.currentTimeMillis());
   prefs.edit().putString("incoming_"+id,job.toString()).commit();
  }catch(Exception ignored){ }
 }
}
