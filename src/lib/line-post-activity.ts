import {normalize} from './analytics';
import {postLine,isMissingLine} from './classification';
import {conversionForPost} from './conversion';
import type {PostMetric,Sale,InteractionCount} from './types';
import type {DatedInteractionMonth} from './dated-interactions';

export function linePostActivity(posts:PostMetric[],sales:Sale[],counts:InteractionCount[],daily:DatedInteractionMonth[],range:{from:string;to:string}) {
 return posts.map(post=>{
  const line=postLine(post,sales);
  return {post,line,lineId:isMissingLine(line)?'missing':`line:${normalize(line)}`,...conversionForPost(post.post_id,post.orders,counts,range,daily)};
 }).sort((a,b)=>(b.interactions??-1)-(a.interactions??-1)||b.post.orders-a.post.orders||a.post.post_id.localeCompare(b.post.post_id));
}
export type LinePostActivity=ReturnType<typeof linePostActivity>[number];
