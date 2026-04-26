/**
 * Utility to serialize MongoDB/Mongoose documents for Next.js getStaticProps/getServerSideProps.
 * Converts _id to string and removes internal __v field.
 */
export function serializeDocument<T>(doc: any): T {
  if (!doc) return doc;
  
  const serialized = JSON.parse(JSON.stringify(doc));
  
  // Ensure _id is a string if it exists
  if (serialized._id) {
    serialized._id = serialized._id.toString();
  }
  
  return serialized as T;
}

export function serializeDocuments<T>(docs: any[]): T[] {
  return docs.map((doc) => serializeDocument<T>(doc));
}
