import { explorerSelection } from './data-explorer.mjs';
import { excelColumn, csvText } from './analytics.mjs';

export function explorerController(state,{render,toast,download}) {
 function reset(sheet=state.data?.meta.primarySheet){Object.assign(state,{rawSheet:sheet,rawQuery:'',rawPublisher:'',rawCampaign:'',rawSort:'row',rawPage:0,rawColumns:'core',rawSize:20,rawSelected:null})}
 function position(rowNumber){
  const all=explorerSelection(state),index=all.rows.findIndex(r=>r.rowNumber===rowNumber);
  if(index<0){toast('该工作表没有这个原始行号。');return false}
  state.rawSelected=rowNumber;state.rawPage=Math.floor(index/state.rawSize);return true;
 }
 function showSelection(){render();document.querySelector('#raw-inspector')?.scrollIntoView({block:'start'});document.querySelector('#raw-inspector')?.focus({preventScroll:true})}
 function click(action,button){
  if(!['inspect-row','raw-sheet','raw-filter','raw-reset','raw-page','raw-jump','raw-select','raw-export'].includes(action))return false;
  if(!state.data){toast('先载入原始工作簿。');return true}
  if(action==='inspect-row'){
   const sheet=button.dataset.sheet,row=Number(button.dataset.row);
   if(!state.data.rawSheets?.some(s=>s.name===sheet)){toast('当前数据没有可查看的原始工作表，请重新导入原文件。');return true}
   reset(sheet);if(!position(row))return true;
   history.replaceState(null,'','#data');state.tab='task';showSelection();return true;
  }
  if(action==='raw-sheet'){reset(button.dataset.sheet);render();return true}
  if(action==='raw-reset'){reset(state.rawSheet);render();return true}
  if(action==='raw-filter'){
   state.rawQuery=document.querySelector('#raw-query').value;
   state.rawPublisher=document.querySelector('#raw-publisher').disabled?'':document.querySelector('#raw-publisher').value;
   state.rawCampaign=document.querySelector('#raw-campaign').disabled?'':document.querySelector('#raw-campaign').value;
   state.rawSort=document.querySelector('#raw-sort').disabled?'row':document.querySelector('#raw-sort').value;
   state.rawPage=0;state.rawSelected=null;render();return true;
  }
  if(action==='raw-page'){state.rawPage+=Number(button.dataset.delta);const y=window.scrollY;render();window.scrollTo(0,y);return true}
  if(action==='raw-select'){state.rawSelected=Number(button.dataset.row);showSelection();return true}
  if(action==='raw-jump'){
   const number=Number(document.querySelector('#raw-row-number').value);
   if(!Number.isInteger(number)||number<1){toast('请输入大于零的整数行号。');return true}
   Object.assign(state,{rawQuery:'',rawPublisher:'',rawCampaign:'',rawSort:'row'});
   if(position(number))showSelection();else render();return true;
  }
  if(action==='raw-export'){
   const s=explorerSelection(state);if(!s.sheet)return true;
   const columns=Array.from({length:s.columnCount},(_,i)=>excelColumn(i+(s.sheet.startCol||0)));
   download(csvText(['Source Sheet','Source Row',...columns],s.rows.map(r=>[s.sheet.name,r.rowNumber,...columns.map((_,c)=>r.cells[c]??'')])),`Air-France-${s.sheet.name}-原始筛选.csv`,'text/csv;charset=utf-8');return true;
  }
  return true;
 }
 function change(el){
  if(el.id==='raw-columns'){state.rawColumns=el.value;render();return true}
  if(el.id==='raw-size'){state.rawSize=Number(el.value);state.rawPage=0;render();return true}
  return false;
 }
 return {reset,click,change};
}
