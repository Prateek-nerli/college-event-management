export interface SignatureConfig {
  id: string;
  name: string;
  role: string;
  imageUrl: string | null; // for future (signature image preview)
}

export interface CertificateData {
  // Header
  topHeader: string; // e.g. "AWARDED BY"
  mainHeader: string; // e.g. college / institute name

  // Title
  title: string; // "Certificate of Participation"
  subTitle: string; // "PROUDLY PRESENTED TO"

  // Body
  presentationText: string; // "This is to certify that"
  bodyText: string; // descriptive sentence

  // Date (optional fixed text; else backend uses event date)
  dateText: string;

  // Footer: signatures
  signatures: SignatureConfig[];

  // Only for PREVIEW on UI (not saved in backend)
  recipientName: string;
}

export const INITIAL_DATA: CertificateData = {
  topHeader: "AWARDED BY",
  mainHeader: "Your College Name",
  title: "Certificate of Participation",
  subTitle: "PROUDLY PRESENTED TO",
  presentationText: "This is to certify that",
  bodyText:
    "has actively participated and contributed to the successful completion of this event.",
  dateText: "",
  recipientName: "Student Name",
  signatures: [
    { id: "1", name: "Principal Name", role: "Principal", imageUrl: null },
    {
      id: "2",
      name: "Coordinator Name",
      role: "Event Coordinator",
      imageUrl: null,
    },
  ],
};
