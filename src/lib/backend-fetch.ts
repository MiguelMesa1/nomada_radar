// A stalled upstream must not hold a server request indefinitely. Preserve
// caller cancellation as well as a per-request upper bound.
export const backendFetch:typeof fetch=(input,init={})=>{
 const sourceSignal=init.signal??(input instanceof Request?input.signal:undefined);
 const deadline=AbortSignal.timeout(10000);
 return fetch(input,{...init,signal:sourceSignal?AbortSignal.any([sourceSignal,deadline]):deadline});
};
