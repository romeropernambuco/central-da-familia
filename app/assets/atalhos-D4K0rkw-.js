const t=new Set;function n(e){return t.add(e),()=>{t.delete(e)}}function r(e,a){t.size&&(e.preventDefault(),t.forEach(o=>o(a)))}export{r as a,n as o};
