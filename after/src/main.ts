import {Viewer} from './Viewer.ts'
function main(){
  const container=document.querySelector('#app') as HTMLElement;
  const world=new Viewer(container);
  world.animate();

}

main();