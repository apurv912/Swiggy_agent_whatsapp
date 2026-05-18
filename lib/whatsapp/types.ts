export type IncomingWhatsAppMessage = {
  from_phone: string;   // sender's phone number, used as sender_id
  from_name: string;    // display name if available, else phone number
  body: string;         // raw message text
  household_id: string; // resolved from phone → household mapping
};
