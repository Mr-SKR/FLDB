/**
 * Utility to serialize MongoDB/Mongoose documents for Next.js getStaticProps/getServerSideProps.
 * Converts _id to string and removes internal __v field.
 */
export function serializeDocument<T>(doc: object | null | undefined): T {
  if (!doc) return doc as unknown as T;
  
  const serialized = JSON.parse(JSON.stringify(doc));
  
  // Ensure _id is a string if it exists
  if (serialized && typeof serialized === "object" && serialized._id) {
    serialized._id = serialized._id.toString();
  }
  
  return serialized as T;
}

export function serializeDocuments<T>(docs: object[]): T[] {
  return docs.map((doc) => serializeDocument<T>(doc));
}
