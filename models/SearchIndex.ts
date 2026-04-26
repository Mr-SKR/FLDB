import mongoose, { Schema, model, models } from 'mongoose';
import { SearchIndexInterface } from '../types/types';

const SearchIndexSchema = new Schema<SearchIndexInterface>({
  videoId: { type: String, required: true },
  videoTitle: { type: String, required: true },
  title: String,
}, { collection: 'searchindexes' });

export default models.SearchIndex || model<SearchIndexInterface>('SearchIndex', SearchIndexSchema);
