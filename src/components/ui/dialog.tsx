'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
export function Modal({open,onClose,title,description,children,titleAction,drawer=false,wide=false}:{open:boolean;onClose:()=>void;title:string;titleAction?:React.ReactNode;description?:string;children:React.ReactNode;drawer?:boolean;wide?:boolean}) {
 return <DialogPrimitive.Root open={open} onOpenChange={v=>!v&&onClose()}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="overlay"/><DialogPrimitive.Content className={drawer?'modal drawer':wide?'modal modal-wide':'modal'}><div className="modal-heading"><div className="publication-name modal-title-row"><DialogPrimitive.Title className="display">{title}</DialogPrimitive.Title>{titleAction}</div>{description&&<DialogPrimitive.Description>{description}</DialogPrimitive.Description>}<DialogPrimitive.Close className="icon-button close" aria-label="Cerrar"><X size={20}/></DialogPrimitive.Close></div>{children}</DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>;
}
