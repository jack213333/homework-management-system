// Adapted from shadcn/ui Dialog (MIT, Copyright 2023 shadcn).
// Source and license: THIRD_PARTY_NOTICES.md.
import * as Primitive from '@radix-ui/react-dialog'
import {useRef,useState,type ReactNode} from 'react'
import {X} from 'lucide-react'
export function GlassDialog({open,onOpenChange,title,description,children,dirty=false,busy=false}:{open:boolean;onOpenChange:(open:boolean)=>void;title:string;description?:string;children:ReactNode;dirty?:boolean;busy?:boolean}){
  const lastFocus=useRef<HTMLElement|null>(null),[discard,setDiscard]=useState(false)
  const change=(value:boolean)=>{if(busy&&!value)return;if(!value&&dirty){setDiscard(true);return}setDiscard(false);onOpenChange(value)}
  return <Primitive.Root open={open} onOpenChange={change}><Primitive.Portal><Primitive.Overlay className="dialog-overlay"/><Primitive.Content className="glass-dialog" onOpenAutoFocus={()=>{lastFocus.current=document.activeElement as HTMLElement}} onCloseAutoFocus={event=>{event.preventDefault();lastFocus.current?.focus()}} onEscapeKeyDown={e=>{if(busy)e.preventDefault()}}><div className="dialog-top"><Primitive.Title className="dialog-title">{title}</Primitive.Title><Primitive.Close className="icon-button" aria-label="关闭对话框" disabled={busy}><X size={18}/></Primitive.Close></div><Primitive.Description className="muted">{description||'填写并确认下面的信息。'}</Primitive.Description>{children}{discard&&<div className="discard-confirm" role="alert"><p>有尚未保存的内容，确定关闭吗？</p><div><button className="button secondary" onClick={()=>setDiscard(false)}>继续填写</button><button className="button primary" onClick={()=>{setDiscard(false);onOpenChange(false)}}>放弃并关闭</button></div></div>}</Primitive.Content></Primitive.Portal></Primitive.Root>
}
