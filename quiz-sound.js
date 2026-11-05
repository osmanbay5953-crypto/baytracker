// A small, layered sound palette; all voices share the site's mute control.
(function(root){
  function createQuizSound(audio){
    const bus=audio.createGain(),filter=audio.createBiquadFilter(),compressor=audio.createDynamicsCompressor();
    bus.gain.value=.65;filter.type='lowpass';filter.frequency.value=4800;
    compressor.threshold.value=-23;compressor.knee.value=18;compressor.ratio.value=3;
    bus.connect(filter).connect(compressor).connect(audio.destination);
    const delay=audio.createDelay(.3),echo=audio.createGain();delay.delayTime.value=.085;echo.gain.value=.12;
    filter.connect(delay).connect(echo).connect(compressor);
    const noise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.25),audio.sampleRate);
    const samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    let lastType='',lastAt=-1;
    function voice(hz,to,duration,level,offset=0,type='sine',pan=0){
      const t=audio.currentTime+offset,osc=audio.createOscillator(),gain=audio.createGain(),position=audio.createStereoPanner();
      osc.type=type;osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+duration);
      gain.gain.setValueAtTime(.00001,t);gain.gain.exponentialRampToValueAtTime(level,t+.004);
      gain.gain.exponentialRampToValueAtTime(.00001,t+duration);
      position.pan.value=pan;osc.connect(gain).connect(position).connect(bus);osc.start(t);osc.stop(t+duration+.01);
      osc.onended=()=>{osc.disconnect();gain.disconnect();position.disconnect();};
    }
    function air(hz,duration,level,offset=0){
      const t=audio.currentTime+offset,source=audio.createBufferSource(),tone=audio.createBiquadFilter(),gain=audio.createGain();
      source.buffer=noise;tone.type='bandpass';tone.frequency.setValueAtTime(hz,t);tone.frequency.exponentialRampToValueAtTime(hz*.55,t+duration);tone.Q.value=.8;
      gain.gain.setValueAtTime(.00001,t);gain.gain.exponentialRampToValueAtTime(level,t+.005);gain.gain.exponentialRampToValueAtTime(.00001,t+duration);
      source.connect(tone).connect(gain).connect(bus);source.start(t);source.stop(t+duration);
      source.onended=()=>{source.disconnect();tone.disconnect();gain.disconnect();};
    }
    function bell(hz,offset=0,level=.035){voice(hz,hz*.998,.32,level,offset);voice(hz*2.01,hz*2,.12,level*.15,offset,'sine',.14);}
    return {
      mute(muted){bus.gain.cancelScheduledValues(audio.currentTime);bus.gain.setTargetAtTime(muted?0:.65,audio.currentTime,.012);},
      play(type){
        if(audio.state!=='running')return;
        const now=audio.currentTime;if(type===lastType&&now-lastAt<.075)return;lastType=type;lastAt=now;
        if(type==='move'){voice(430,270,.065,.032,0,'triangle');air(1800,.025,.018);}
        else if(type==='select'){voice(680,520,.07,.029);air(2400,.028,.018);}
        else if(type==='lock'){air(1800,.045,.035);voice(480,240,.09,.034);bell(740,.055,.018);}
        else if(type==='question'){air(1400,.16,.025);voice(210,420,.12,.024,0,'triangle');bell(660,.09,.02);}
        else if(type==='correct'){bell(659,0,.04);bell(988,.085,.031);bell(1319,.17,.022);voice(164,164,.22,.025);}
        else if(type==='partial'){bell(587,0,.031);bell(784,.095,.025);}
        else if(type==='wrong'){voice(220,110,.22,.035,0,'triangle');air(500,.12,.02);voice(110,85,.18,.025,.04);}
        else if(type==='tick'||type==='tickFast'||type==='tickUrgent'){
          const level=type==='tickUrgent'?.026:type==='tickFast'?.021:.016;
          voice(1040,610,.038,level,0,'triangle');air(2100,.022,level*.7);
        }
        else if(type==='finish'){[523,659,784,1047].forEach((hz,i)=>bell(hz,i*.11,.028));voice(131,131,.65,.026);air(2100,.2,.02,.2);}
      }
    };
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=createQuizSound;
  else root.BayQuizSound=createQuizSound;
})(typeof window!=='undefined'?window:globalThis);
