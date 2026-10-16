'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
export function Modal({open,onClose,title,description,children,drawer=false}:{open:boolean;onClose:()=>void;title:string;description?:string;children:React.ReactNode;drawer?:boolean}) {
 return <DialogPrimitive.Root open={open} onOpenChange={v=>!v&&onClose()}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="overlay"/><DialogPrimitive.Content className={drawer?'modal drawer':'modal'}><div className="modal-heading"><DialogPrimitive.Title className="display">{title}</DialogPrimitive.Title>{description&&<DialogPrimitive.Description>{description}</DialogPrimitive.Description>}<DialogPrimitive.Close className="icon-button close" aria-label="Cerrar"><X size={20}/></DialogPrimitive.Close></div>{children}</DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>;
}
