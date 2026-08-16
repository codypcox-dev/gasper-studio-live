
(() => {
  const $ = id => document.getElementById(id);
  const query = new URLSearchParams(location.search);
  if(query.get('focus')==='avatar')document.body.classList.add('avatar-focus');
  const referencePanel = $('referencePanel'), referenceToggle = $('referenceToggle');
  const BASELINE_SHA256 = '707c39bbefaaeff2dc0d02cf01b437cd72f61370b0e9043fef18c96f23e31b89';
  const CONTOUR_SAMPLES = 512;
  const STRUCTURAL_NODES = 360;
  const RELIEF_SAMPLES = 1000;
  const MESH_RINGS = 15;
  const MESH_SECTORS = 24;
  const ADAPTIVE_STRUCTURAL_TOPOLOGY = SidekickAdaptiveMesh.createPolarTopology({ rings: 15, sectors: 24 });
  const DETAIL_TOPOLOGY = SidekickAdaptiveMesh.createPolarTopology({ rings: 25, sectors: 40 });
  const FACE_PLANE = SidekickFacePlane.createFacePlane({center:[120,112],eyes:[[84,99],[156,99]],mouth:[121,140],eyeWidth:38});
  const RELIEF_PRESETS = Object.freeze({
    none:Object.freeze([]),
    brow_raise:Object.freeze([{kind:'brow_raise',u:.88,v:.47,radius:.105,amplitude:.76},{kind:'brow_raise',u:.12,v:.47,radius:.105,amplitude:.76}]),
    brow_knit:Object.freeze([{kind:'brow_knit',u:0,v:.43,radius:.115,amplitude:.88}]),
    cheek_dimple:Object.freeze([{kind:'cheek_dimple',u:.27,v:.55,radius:.10,amplitude:-.88}]),
    effort_pinches:Object.freeze([{kind:'effort_pinches',u:0,v:.47,radius:.15,amplitude:.78}]),
    goosebumps:Object.freeze([{kind:'goosebumps',u:.5,v:.58,radius:.62,amplitude:.92}]),
  });
  const IDLE_CYCLE_SECONDS = 8;
  const AUTHORED_YAW_RANGE = Object.freeze([0,45]);
  const EMOTION_FIXTURES = Object.freeze({"neutral-settled":{"reliefMode":"none","eyeOpenL":0.55,"eyeOpenR":0.55,"eyeTiltL":-0.25,"eyeTiltR":0.25,"eyeLiftL":0,"eyeLiftR":0,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.45,"mouthOpen":0.05,"mouthCurve":0.04,"pullL":0.015,"pullR":0.015,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0,"crown":0,"energy":0.72,"browL":0,"browR":0,"cheekL":0,"cheekR":0,"tension":0.1,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.78,"motionGain":0.58,"holdBias":0.74,"microSeed":1.1,"glowLag":0.12,"transitionSeconds":0.72,"id":"neutral-settled","family":"neutral","label":"Settled","note":"Quiet, socially available resting state."},"neutral-social":{"reliefMode":"none","eyeOpenL":0.255,"eyeOpenR":0.255,"eyeTiltL":-1.2,"eyeTiltR":1.2,"eyeLiftL":0,"eyeLiftR":0,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.52,"mouthOpen":0.1,"mouthCurve":0.12,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0,"crown":0,"energy":0.76,"browL":0,"browR":0,"cheekL":0.08,"cheekR":0.08,"tension":0.12,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.92,"motionGain":0.64,"holdBias":0.5,"microSeed":2.2,"glowLag":0.12,"transitionSeconds":0.72,"id":"neutral-social","family":"neutral","label":"Social","note":"Slightly more open and receptive neutral."},"neutral-wry":{"reliefMode":"none","eyeOpenL":0.205,"eyeOpenR":0.235,"eyeTiltL":-2.0,"eyeTiltR":1.6,"eyeLiftL":0,"eyeLiftR":0,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.48,"mouthOpen":0.085,"mouthCurve":0.14,"pullL":0.01,"pullR":0.13,"mouthLift":0,"mouthSkew":0.08,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0.07,"crown":0,"energy":0.72,"browL":0,"browR":0,"cheekL":0,"cheekR":0,"tension":0.16,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.7,"motionGain":0.56,"holdBias":0.5,"microSeed":3.4,"glowLag":0.12,"transitionSeconds":0.72,"id":"neutral-wry","family":"neutral","label":"Wry","note":"Competent, understated asymmetry without overt mischief."},"listening-orient":{"reliefMode":"brow_raise","eyeOpenL":0.3,"eyeOpenR":0.275,"eyeTiltL":-2.1,"eyeTiltR":0.6,"eyeLiftL":-0.7,"eyeLiftR":-0.35,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.42,"mouthOpen":0.045,"mouthCurve":0.01,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0.09,"crown":0.1,"energy":0.86,"browL":0.28,"browR":0.16,"cheekL":0,"cheekR":0,"tension":0.12,"focusX":-0.14,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.08,"motionGain":0.7,"holdBias":0.5,"microSeed":4.2,"glowLag":0.12,"transitionSeconds":0.56,"id":"listening-orient","family":"listening","label":"Orient","note":"Attention turns toward incoming information."},"listening-hold":{"reliefMode":"brow_raise","eyeOpenL":0.285,"eyeOpenR":0.285,"eyeTiltL":-1.2,"eyeTiltR":1.2,"eyeLiftL":-0.45,"eyeLiftR":-0.45,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.4,"mouthOpen":0.035,"mouthCurve":0.0,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0,"crown":0.07,"energy":0.82,"browL":0.22,"browR":0.22,"cheekL":0,"cheekR":0,"tension":0.18,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.62,"motionGain":0.42,"holdBias":0.86,"microSeed":5.1,"glowLag":0.12,"transitionSeconds":0.72,"id":"listening-hold","family":"listening","label":"Hold","note":"Stable concentrated listening with reduced body noise."},"listening-receive":{"reliefMode":"none","eyeOpenL":0.62,"eyeOpenR":0.62,"eyeTiltL":-1.4,"eyeTiltR":1.0,"eyeLiftL":0,"eyeLiftR":0,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.47,"mouthOpen":0.06,"mouthCurve":0.08,"pullL":0.06,"pullR":0.09,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0,"crown":0.05,"energy":0.84,"browL":0,"browR":0,"cheekL":0.08,"cheekR":0.12,"tension":0.12,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.84,"motionGain":0.58,"holdBias":0.5,"microSeed":6.3,"glowLag":0.12,"transitionSeconds":0.72,"id":"listening-receive","family":"listening","label":"Receive","note":"Warm acknowledgement while continuing to listen."},"thinking-scan":{"reliefMode":"brow_knit","eyeOpenL":0.2,"eyeOpenR":0.255,"eyeTiltL":-3.2,"eyeTiltR":2.4,"eyeLiftL":0.25,"eyeLiftR":-0.55,"eyeWidthL":0.96,"eyeWidthR":1.04,"mouthWidth":0.39,"mouthOpen":0.035,"mouthCurve":-0.035,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":-0.08,"mouthPinch":0.22,"mouthRound":0,"wide":0,"low":0,"asym":0.17,"crown":0.1,"energy":0.8,"browL":-0.22,"browR":0.14,"cheekL":0,"cheekR":0,"tension":0.36,"focusX":0.22,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.76,"motionGain":0.5,"holdBias":0.5,"microSeed":7.2,"glowLag":0.12,"transitionSeconds":0.72,"id":"thinking-scan","family":"thinking","label":"Scan","note":"Internal search with lateral eye asymmetry."},"thinking-knit":{"reliefMode":"brow_knit","eyeOpenL":0.28,"eyeOpenR":0.28,"eyeTiltL":-4.1,"eyeTiltR":4.1,"eyeLiftL":0.35,"eyeLiftR":0.35,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.36,"mouthOpen":0.02,"mouthCurve":-0.35,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0.4,"mouthRound":0,"wide":0,"low":0.12,"asym":0,"crown":0.12,"energy":0.76,"browL":-0.36,"browR":-0.36,"cheekL":0,"cheekR":0,"tension":0.58,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.56,"motionGain":0.38,"holdBias":0.82,"microSeed":8.4,"glowLag":0.12,"transitionSeconds":0.72,"id":"thinking-knit","family":"thinking","label":"Knit","note":"Compressed analytical effort with local brow tension."},"thinking-resolve":{"reliefMode":"effort_pinches","eyeOpenL":0.205,"eyeOpenR":0.235,"eyeTiltL":-2.4,"eyeTiltR":1.2,"eyeLiftL":-0.1,"eyeLiftR":-0.35,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.44,"mouthOpen":0.095,"mouthCurve":0.06,"pullL":0.02,"pullR":0.11,"mouthLift":0,"mouthSkew":0.05,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0.08,"crown":0.08,"energy":0.88,"browL":-0.1,"browR":0.08,"cheekL":0,"cheekR":0,"tension":0.32,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.96,"motionGain":0.58,"holdBias":0.5,"microSeed":9.6,"glowLag":0.12,"transitionSeconds":0.64,"id":"thinking-resolve","family":"thinking","label":"Resolve","note":"Thought converges toward an answer."},"mischievous-left":{"reliefMode":"cheek_dimple","eyeOpenL":0.105,"eyeOpenR":0.205,"eyeTiltL":-6.2,"eyeTiltR":3.0,"eyeLiftL":0.45,"eyeLiftR":-0.25,"eyeWidthL":0.94,"eyeWidthR":1.03,"mouthWidth":0.59,"mouthOpen":0.11,"mouthCurve":0.31,"pullL":0.52,"pullR":-0.01,"mouthLift":0,"mouthSkew":-0.16,"mouthPinch":0,"mouthRound":0,"wide":0.12,"low":0,"asym":-0.34,"crown":0.05,"energy":0.88,"browL":0,"browR":0,"cheekL":0.54,"cheekR":0.07,"tension":0.43,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.12,"motionGain":0.72,"holdBias":0.5,"microSeed":10.2,"glowLag":0.12,"transitionSeconds":0.72,"id":"mischievous-left","family":"mischievous","label":"Left smirk","note":"Knowing asymmetry weighted to the left side."},"mischievous-right":{"reliefMode":"cheek_dimple","eyeOpenL":0.195,"eyeOpenR":0.105,"eyeTiltL":-3.0,"eyeTiltR":6.2,"eyeLiftL":-0.25,"eyeLiftR":0.45,"eyeWidthL":1.03,"eyeWidthR":0.94,"mouthWidth":0.59,"mouthOpen":0.11,"mouthCurve":0.31,"pullL":-0.01,"pullR":0.52,"mouthLift":0,"mouthSkew":0.16,"mouthPinch":0,"mouthRound":0,"wide":0.12,"low":0,"asym":0.34,"crown":0.05,"energy":0.88,"browL":0,"browR":0,"cheekL":0.07,"cheekR":0.54,"tension":0.43,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.12,"motionGain":0.72,"holdBias":0.5,"microSeed":11.4,"glowLag":0.12,"transitionSeconds":0.72,"id":"mischievous-right","family":"mischievous","label":"Right smirk","note":"Knowing asymmetry weighted to the right side."},"mischievous-spark":{"reliefMode":"cheek_dimple","eyeOpenL":0.48,"eyeOpenR":0.52,"eyeTiltL":-5.0,"eyeTiltR":2.2,"eyeLiftL":0.05,"eyeLiftR":-0.55,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.65,"mouthOpen":0.42,"mouthCurve":0.65,"pullL":0.06,"pullR":0.48,"mouthLift":0,"mouthSkew":0.11,"mouthPinch":0,"mouthRound":0,"wide":0.18,"low":0,"asym":0.28,"crown":0.12,"energy":1.02,"browL":0,"browR":0,"cheekL":0.18,"cheekR":0.48,"tension":0.48,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.32,"motionGain":0.82,"holdBias":0.5,"microSeed":12.7,"glowLag":0.12,"transitionSeconds":0.48,"id":"mischievous-spark","family":"mischievous","label":"Spark","note":"Brief high-energy cleverness without juvenile sweetness."},"pleased-contained":{"reliefMode":"cheek_dimple","eyeOpenL":0.5,"eyeOpenR":0.5,"eyeTiltL":-1.7,"eyeTiltR":1.7,"eyeLiftL":0.15,"eyeLiftR":0.15,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.62,"mouthOpen":0.28,"mouthCurve":0.48,"pullL":0.24,"pullR":0.26,"mouthLift":0.05,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0.2,"low":0,"asym":0,"crown":0,"energy":0.92,"browL":0,"browR":0,"cheekL":0.3,"cheekR":0.32,"tension":0.26,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.78,"motionGain":0.58,"holdBias":0.5,"microSeed":13.8,"glowLag":0.12,"transitionSeconds":0.72,"id":"pleased-contained","family":"pleased","label":"Contained","note":"Subtle satisfaction with restrained energy release."},"pleased-bright":{"reliefMode":"cheek_dimple","eyeOpenL":0.275,"eyeOpenR":0.275,"eyeTiltL":-1.7,"eyeTiltR":1.7,"eyeLiftL":-0.5,"eyeLiftR":-0.5,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.76,"mouthOpen":0.34,"mouthCurve":0.48,"pullL":0.32,"pullR":0.36,"mouthLift":0.08,"mouthSkew":0,"mouthPinch":0,"mouthRound":0.12,"wide":0.4,"low":0,"asym":0,"crown":0.04,"energy":1.08,"browL":0,"browR":0,"cheekL":0.46,"cheekR":0.5,"tension":0.34,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.02,"motionGain":0.76,"holdBias":0.5,"microSeed":14.9,"glowLag":0.12,"transitionSeconds":0.52,"id":"pleased-bright","family":"pleased","label":"Bright","note":"Clear completion response with open luminous face."},"pleased-warm":{"reliefMode":"cheek_dimple","eyeOpenL":0.235,"eyeOpenR":0.245,"eyeTiltL":-1.0,"eyeTiltR":1.0,"eyeLiftL":0,"eyeLiftR":0,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.68,"mouthOpen":0.23,"mouthCurve":0.43,"pullL":0.28,"pullR":0.3,"mouthLift":0.06,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0.28,"low":0,"asym":0,"crown":0,"energy":0.98,"browL":0,"browR":0,"cheekL":0.4,"cheekR":0.42,"tension":0.28,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.86,"motionGain":0.64,"holdBias":0.5,"microSeed":15.7,"glowLag":0.12,"transitionSeconds":0.72,"id":"pleased-warm","family":"pleased","label":"Warm","note":"Soft relational warmth after success."},"blocked-uncertain":{"reliefMode":"brow_knit","eyeOpenL":0.23,"eyeOpenR":0.185,"eyeTiltL":-0.2,"eyeTiltR":2.8,"eyeLiftL":-0.15,"eyeLiftR":0.45,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.38,"mouthOpen":0.055,"mouthCurve":-0.1,"pullL":0.02,"pullR":-0.02,"mouthLift":0,"mouthSkew":-0.08,"mouthPinch":0.28,"mouthRound":0,"wide":0,"low":0.18,"asym":-0.12,"crown":-0.03,"energy":0.66,"browL":0.1,"browR":-0.22,"cheekL":0,"cheekR":0,"tension":0.42,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.62,"motionGain":0.4,"holdBias":0.5,"microSeed":16.2,"glowLag":0.12,"transitionSeconds":0.44,"id":"blocked-uncertain","family":"blocked","label":"Uncertain","note":"Momentary ambiguity without collapse or panic."},"blocked-compressed":{"reliefMode":"effort_pinches","eyeOpenL":0.18,"eyeOpenR":0.18,"eyeTiltL":-2.8,"eyeTiltR":2.8,"eyeLiftL":0.75,"eyeLiftR":0.75,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.31,"mouthOpen":0.02,"mouthCurve":-0.5,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0.58,"mouthRound":0,"wide":-0.14,"low":0.42,"asym":0,"crown":-0.12,"energy":0.54,"browL":-0.28,"browR":-0.28,"cheekL":0,"cheekR":0,"tension":0.72,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":0.985,"postureScaleY":1.012,"bodyLean":0,"tempo":0.46,"motionGain":0.24,"holdBias":0.9,"microSeed":17.5,"glowLag":0.12,"transitionSeconds":0.4,"id":"blocked-compressed","family":"blocked","label":"Compressed","note":"A bounded failure state with inward shell pressure."},"blocked-retry":{"reliefMode":"brow_raise","eyeOpenL":0.22,"eyeOpenR":0.245,"eyeTiltL":-1.6,"eyeTiltR":0.8,"eyeLiftL":-0.2,"eyeLiftR":-0.45,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.41,"mouthOpen":0.085,"mouthCurve":0.01,"pullL":0.01,"pullR":0.06,"mouthLift":0,"mouthSkew":0.04,"mouthPinch":0.18,"mouthRound":0,"wide":0,"low":0,"asym":0,"crown":0.04,"energy":0.76,"browL":0.1,"browR":0.18,"cheekL":0,"cheekR":0,"tension":0.3,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.92,"motionGain":0.54,"holdBias":0.5,"microSeed":18.7,"glowLag":0.12,"transitionSeconds":0.62,"id":"blocked-retry","family":"blocked","label":"Retry","note":"Recovery begins while uncertainty remains visible."}});
  const EMOTION_FAMILIES = Object.freeze({"neutral":["neutral-settled","neutral-social","neutral-wry"],"listening":["listening-orient","listening-hold","listening-receive"],"thinking":["thinking-scan","thinking-knit","thinking-resolve"],"mischievous":["mischievous-left","mischievous-right","mischievous-spark"],"pleased":["pleased-contained","pleased-bright","pleased-warm"],"blocked":["blocked-uncertain","blocked-compressed","blocked-retry"]});
  const EMOTION_ORDER = Object.freeze(['neutral','listening','thinking','mischievous','pleased','blocked']);
  const EMOTION_DEMO_SEQUENCE = Object.freeze(['neutral-social','listening-orient','listening-hold','thinking-scan','thinking-knit','thinking-resolve','mischievous-spark','pleased-bright','blocked-uncertain','blocked-retry','neutral-settled']);
  const EMOTION_TRANSITION_GRAPH = Object.freeze({
    neutral:Object.freeze(['listening','thinking','mischievous','pleased','blocked','dormant']),
    listening:Object.freeze(['thinking','pleased','blocked','neutral','dormant']),
    thinking:Object.freeze(['pleased','mischievous','blocked','listening','neutral','dormant']),
    mischievous:Object.freeze(['pleased','listening','blocked','neutral','dormant']),
    pleased:Object.freeze(['neutral','listening','blocked','dormant']),
    blocked:Object.freeze(['thinking','listening','neutral','dormant']),
    dormant:Object.freeze(['neutral','listening'])
  });
  const STATES = EMOTION_FIXTURES;
  const MICROSTATE_SCHEMA = Object.freeze({
    acknowledge:Object.freeze({label:'Acknowledge',durationMs:520,deltas:Object.freeze({eyeOpenL:.028,eyeOpenR:.038,mouthOpen:.035,mouthCurve:.045,cheekL:.07,cheekR:.09,energy:.08,crown:.025})}),
    orient:Object.freeze({label:'Orient',durationMs:620,deltas:Object.freeze({focusX:-.18,eyeLiftL:-.42,eyeLiftR:-.24,postureX:-.85,bodyLean:-.025,energy:.06})}),
    anticipate:Object.freeze({label:'Anticipate',durationMs:680,deltas:Object.freeze({eyeOpenL:.055,eyeOpenR:.045,mouthOpen:.025,crown:.055,tension:.10,postureY:-.35,energy:.10})}),
    reconsider:Object.freeze({label:'Reconsider',durationMs:760,deltas:Object.freeze({eyeOpenL:-.035,eyeOpenR:.020,eyeTiltL:-1.2,eyeTiltR:.65,mouthSkew:-.065,mouthPinch:.18,focusX:.16,tension:.18})}),
    interruption:Object.freeze({label:'Interruption',durationMs:430,deltas:Object.freeze({eyeOpenL:.085,eyeOpenR:.075,mouthOpen:.06,crown:.08,energy:.15,tension:.12,postureY:-.50})}),
    recover:Object.freeze({label:'Recover',durationMs:820,deltas:Object.freeze({eyeOpenL:.035,eyeOpenR:.045,mouthCurve:.055,mouthOpen:.025,energy:.12,tension:-.14,postureScaleX:.012,postureScaleY:-.008})}),
    completion:Object.freeze({label:'Completion linger',durationMs:1050,deltas:Object.freeze({eyeOpenL:-.018,eyeOpenR:-.012,mouthCurve:.10,pullL:.08,pullR:.10,cheekL:.12,cheekR:.15,energy:.07,holdBias:.12})}),
    curiosity:Object.freeze({label:'Curiosity spike',durationMs:610,deltas:Object.freeze({eyeOpenL:.045,eyeOpenR:.09,eyeLiftR:-.38,mouthOpen:.035,mouthSkew:.045,crown:.07,focusX:.14,energy:.13})}),
    amusement:Object.freeze({label:'Restrained amusement',durationMs:900,deltas:Object.freeze({eyeOpenL:-.04,eyeOpenR:.012,mouthCurve:.14,pullR:.18,mouthSkew:.085,cheekR:.18,asym:.10,energy:.06})}),
    release:Object.freeze({label:'Attention release',durationMs:780,deltas:Object.freeze({eyeOpenL:-.025,eyeOpenR:-.025,mouthOpen:-.02,tension:-.18,energy:-.12,postureY:.30})}),
    processing:Object.freeze({label:'Processing pulse',durationMs:720,deltas:Object.freeze({eyeOpenL:-.025,eyeOpenR:.025,mouthPinch:.16,tension:.22,crown:.035,energy:.14,focusX:.10})}),
    response:Object.freeze({label:'Response pulse',durationMs:360,deltas:Object.freeze({mouthOpen:.22,mouthRound:.12,mouthCurve:.04,cheekL:.05,cheekR:.07,energy:.15,postureY:-.20})}),
    wake:Object.freeze({label:'Wake recognition',durationMs:920,deltas:Object.freeze({eyeOpenL:.075,eyeOpenR:.085,mouthOpen:.03,mouthCurve:.055,crown:.06,energy:.18,postureY:-.42})})
  });
  const MICROSTATE_ORDER = Object.freeze(['acknowledge','orient','anticipate','curiosity','processing','reconsider','interruption','recover','completion','amusement','release','response','wake']);
  const EMBODIMENT_TRANSITION_GRAPH = Object.freeze({
    presence:Object.freeze(['low-orbit','comet','wispwalker','halo','lantern','dormant-orbit']),
    'low-orbit':Object.freeze(['presence','dormant-orbit']),
    comet:Object.freeze(['presence','dormant-orbit']),
    wispwalker:Object.freeze(['presence','dormant-orbit']),
    halo:Object.freeze(['presence','dormant-orbit']),
    lantern:Object.freeze(['presence','dormant-orbit']),
    'dormant-orbit':Object.freeze(['presence','singularity','low-orbit','comet','wispwalker','halo','lantern']),
    singularity:Object.freeze(['dormant-orbit'])
  });
  const DORMANT_ENTRY_ROUTES = Object.freeze({
    neutral:Object.freeze({fixture:'neutral-settled',microstate:'release'}),
    listening:Object.freeze({fixture:'listening-hold',microstate:'release'}),
    thinking:Object.freeze({fixture:'thinking-knit',microstate:'processing'}),
    mischievous:Object.freeze({fixture:'mischievous-left',microstate:'amusement'}),
    pleased:Object.freeze({fixture:'pleased-contained',microstate:'completion'}),
    blocked:Object.freeze({fixture:'blocked-compressed',microstate:'recover'})
  });
  const EMBODIMENT_EMOTION_MATRIX = Object.freeze({
    presence:Object.freeze({face:1,posture:1,note:'canonical social read'}),
    'low-orbit':Object.freeze({face:1.10,posture:.58,note:'closer, wider, ground-social'}),
    comet:Object.freeze({face:1.04,posture:1.12,note:'head-bound directional attention'}),
    wispwalker:Object.freeze({face:.98,posture:1.08,note:'load-bearing creature cadence'}),
    halo:Object.freeze({face:.98,posture:.92,note:'contained orbital intellect'}),
    lantern:Object.freeze({face:.94,posture:1.08,note:'buoyant curiosity'}),
    'dormant-orbit':Object.freeze({face:0,posture:.35,note:'identity in suspended optics'}),
    singularity:Object.freeze({face:0,posture:.10,note:'identity compressed beyond emission'})
  });
  const KEY_ANCHORS = [3.34, 3.46, 3.58, 3.7, 3.82, 3.94, 4.06, 4.18, 4.3, 4.42, 4.54, 4.64, 4.72];
  const FILL_ANCHORS = [5.7, 5.82, 5.94, 6.06, 6.18, 6.3, 6.42, 6.52];
  const RIM_ANCHORS = [0.02, 0.14, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86, 0.98];
  const BOUNCE_ANCHORS = [1.1, 1.22, 1.34, 1.46, 1.58, 1.7, 1.82, 1.94, 2.06];
  const CROWN_ANCHORS = [3.42,3.58,3.74,3.90,4.06,4.22,4.38,4.54,4.68];
  const CROWN_HOT_ANCHORS = [4.10,4.24,4.38,4.52,4.66,4.80,4.94];
  const CYAN_ANCHORS = [.58,.78,.98,1.18,1.38,1.58,1.78,1.98,2.18,2.38,2.58];
  const LEFT_LOBE_ANCHORS = [2.77,2.88,2.99,3.10,3.21,3.32];
  const RIGHT_LOBE_ANCHORS = [-.28,-.17,-.06,.05,.16,.27];
  const SECONDARY_ANCHORS = [5.50,5.64,5.78,5.92,6.06,6.20,6.34];
  const RIGHT_CROWN_PIN_ANCHORS = [4.94,5.06,5.18,5.30,5.42];
  const ORDER = EMOTION_ORDER;
  const NS = 'http://www.w3.org/2000/svg';
  const GASPER_IDENTITY = Object.freeze({
    character:'Gasper',
    species:'unclassifiable living intelligence',
    maturity:'ageless and emotionally mature',
    genderCoding:'mostly ungendered',
    personality:Object.freeze(['curious and energetic','knowing, amused, quietly mischievous','strange and otherworldly','calmly competent']),
    immediateRead:'friendly, intelligent, and slightly up to something',
    identityTest:'No matter what form Gasper takes, his mass, light, face, timing, and quiet intelligence reorganize as one living thing.',
    material:'viscoelastic living mass contained by a firm polished dark-pearl optical boundary',
    canonicalTruth:'semantic parameter data that deterministically generates the runtime result',
    humanVisualAuthority:true,
  });
  const FORM_PROFILES = Object.freeze({
    'presence':Object.freeze({label:'Gasper Presence',note:'Protected home embodiment: knowing warmth, mature competence, restrained mischief',sx:1.000,sy:1.015,cx:0,cy:0,face:true,faceY:0,faceScaleX:1,faceScaleY:1,horizon:.12,disc:0}),
    'singularity':Object.freeze({label:'Dormant Singularity: Gravitational Seed',note:'Gasper compresses mass, light, face and attention into a family-native absorptive horizon; no detached identity layer',sx:1,sy:1,cx:0,cy:1,face:false,faceY:0,faceScaleX:1,faceScaleY:1,horizon:1.00,disc:.72,lensed:0,geometryModel:'dormant-family',dormantCollapse:1,dormantSpin:.18}),
    'dormant-orbit':Object.freeze({label:'Dormant Orbit: Quiet Gyre',note:'Gasper held in stable low-energy self-maintenance: residual gravity well, traveling spectral energy, disciplined asymmetry',sx:1,sy:1,cx:0,cy:1,face:false,faceY:0,faceScaleX:1,faceScaleY:1,horizon:.34,disc:1.00,lensed:0,geometryModel:'dormant-family',dormantCollapse:.10,dormantSpin:1}),
    'wispwalker':Object.freeze({label:'Wispwalker',note:'Load-bearing foot roots emerge continuously from redistributed lower-shell mass',sx:.93,sy:1.16,cx:0,cy:2,face:true,faceY:-1,faceScaleX:.97,faceScaleY:.97,horizon:.22,disc:0,frontAppendage:'rooted-feet',tailPolicy:'none'}),
    'comet':Object.freeze({label:'Comet Familiar',note:'Protected forward cranial dome flowing through a continuous shoulder into a tapered wake',sx:1,sy:1,cx:0,cy:0,face:true,faceX:18,faceY:-1,faceScaleX:.92,faceScaleY:.94,eyeWidthScale:1.08,eyeOpenScale:1.08,horizon:.42,disc:0,geometryModel:'forward-mass-attached-wake'}),
    'halo':Object.freeze({label:'Halo Crown',note:'Orbital intellect and event-horizon emphasis',sx:1.045,sy:.955,cx:0,cy:1,face:true,faceY:1,faceScaleX:1.01,faceScaleY:.96,horizon:.92,disc:0}),
    'lantern':Object.freeze({label:'Lantern Geist',note:'Tall, curious, and magically buoyant',sx:.900,sy:1.105,cx:0,cy:-1,face:true,faceY:-5,faceScaleX:.92,faceScaleY:.98,horizon:.30,disc:0}),
    'low-orbit':Object.freeze({label:'Low Orbit',note:'Ground-settled viscoelastic puddle with smooth side continuity and an intimate social face plane',sx:1,sy:1,cx:0,cy:0,face:true,faceY:11.5,faceScaleX:.88,faceScaleY:.74,eyeWidthScale:1.32,eyeOpenScale:1.48,mouthYShift:-6.5,mouthScale:1.14,mouthOpenScale:1.28,horizon:.34,disc:0,frontAppendage:'none',tailPolicy:'none',geometryModel:'ground-tangent-puddle'}),
  });
  const VIEW_RIG_CONTRACT = Object.freeze({
    interpolation:'authored-anchor-harmonic-interpolation',
    projection:'authored-anchor-harmonic-interpolation',
    anchorAuthority:'hand-authored-45',
    degrees:360,
    anchors:Object.freeze([0,45,90,135,180,225,270,315]),
    authoredYawRange:AUTHORED_YAW_RANGE,
    authoredCheckpoints:Object.freeze([0,22.5,45]),
    rotationReady:false,
    currentAuthority:'bounded-authored-key-view-comparison',
    tailVisibility:'none',
  });
  const SILHOUETTE_PROFILES = FORM_PROFILES;
  const MATERIAL_MESH_BINDINGS = Object.freeze([
    ['shell-base','Shell base'],['inner-volume','Inner pearl volume'],['violet-crown','Violet crown bloom'],['cyan-reservoir','Cyan subsurface reservoir'],['cosmic-texture','Cosmic volume texture'],['adaptive-relief','Adaptive micro-relief'],['event-horizon','Event horizon and lensing'],['key-reflection','Primary key reflection'],['secondary-reflection','Secondary reflection'],['lobe-glints','Lobe glints'],['edge-rims','Edge rims and bounce'],['face-recess','Face recess'],['face-emission','Face emission'],['ground-contact','Ground contact']
  ]);

  const body = $('body'), avatar = $('avatar'), stage = $('stage'), clipBody = $('clipBody'), ground = $('ground'), contactShadow = $('contactShadow'), idleRig = $('idleRig'), chromaticShell = $('chromaticShell');
  const violetFieldNode = $('violetFieldNode'), cyanFieldNode = $('cyanFieldNode'), faceFieldNode = $('faceFieldNode');
  const shellChromaticPath = $('shellChromaticPath'), innerVolumePath = $('innerVolumePath'), pearlCorePath = $('pearlCorePath'), violetCorePath = $('violetCorePath'), crownBloomPath = $('crownBloomPath'), crownHotspotPath = $('crownHotspotPath'), cyanReservoirPath = $('cyanReservoirPath'), cosmicCloudPath = $('cosmicCloudPath'), specularSurfacePath = $('specularSurfacePath'), cosmicCellA = $('cosmicCellA'), cosmicCellB = $('cosmicCellB'), cosmicCellC = $('cosmicCellC'), cosmicCellD = $('cosmicCellD'), violetCaustic = $('violetCaustic'), violetCaustic2 = $('violetCaustic2'), cyanCaustic = $('cyanCaustic'), blueCaustic2 = $('blueCaustic2'), pearlCaustic = $('pearlCaustic'), cosmicFlecks = $('cosmicFlecks');
  const reliefLayer = $('reliefLayer'), reliefHighlight = $('reliefHighlight'), reliefShadow = $('reliefShadow'), keyReflectionLayer = $('keyReflectionLayer'), secondaryReflectionLayer = $('secondaryReflectionLayer'), lobeGlintsLayer = $('lobeGlintsLayer');
  const keyFacetA = $('keyFacetA'), keyFacetB = $('keyFacetB'), keyFacetC = $('keyFacetC'), keyFacetD = $('keyFacetD'), keyHalo = $('keyHalo'), keyBand = $('keyBand'), keyCore = $('keyCore'), rightCrownPin = $('rightCrownPin'), fillHalo = $('fillHalo'), fillBand = $('fillBand'), secondaryCore = $('secondaryCore'), leftLobeShade = $('leftLobeShade'), rightLobeShade = $('rightLobeShade'), leftLobeVolume = $('leftLobeVolume'), rightLobeVolume = $('rightLobeVolume'), leftLobeGlint = $('leftLobeGlint'), rightLobeGlint = $('rightLobeGlint'), leftLobeAura = $('leftLobeAura'), rightLobeAura = $('rightLobeAura'), containedLobeMaterial = $('containedLobeMaterial'), exteriorAuraLayer = $('exteriorAuraLayer'), rim = $('rim'), rightRim = $('rightRim'), bounce = $('bounce');
  const eyeL = $('eyeL'), eyeR = $('eyeR'), mouth = $('mouth'), faceRecessLayer = $('faceRecessLayer'), faceEmissionLayer = $('faceEmissionLayer'), accretionArc = $('accretionArc'), horizonLens = $('horizonLens'), horizonBloom = $('horizonBloom');
  const expressionShellLayer=$('expressionShellLayer'),expressionOcclusionLayer=$('expressionOcclusionLayer'),browTensionL=$('browTensionL'),browTensionR=$('browTensionR'),cheekTensionL=$('cheekTensionL'),cheekTensionR=$('cheekTensionR'),mouthTension=$('mouthTension'),eyeTroughL=$('eyeTroughL'),eyeTroughR=$('eyeTroughR'),mouthTrough=$('mouthTrough');
  const accretionDiscBack = $('accretionDiscBack'), accretionDiscBackGlow = $('accretionDiscBackGlow'), accretionDiscFront = $('accretionDiscFront'), accretionDiscHotCore = $('accretionDiscHotCore');
  const accretionRearLens = $('accretionRearLens'), accretionRearLensGlow = $('accretionRearLensGlow'), accretionRearLensOuter = $('accretionRearLensOuter'), accretionRearLensInner = $('accretionRearLensInner'), accretionNearPlane = $('accretionNearPlane'), accretionNearPlaneGlow = $('accretionNearPlaneGlow'), accretionNearPlaneBand = $('accretionNearPlaneBand'), accretionNearPlaneHot = $('accretionNearPlaneHot'), accretionLowerLens = $('accretionLowerLens'), photonRingInner = $('photonRingInner'), eventHorizonCore = $('eventHorizonCore');
  const viewTailBack = $('viewTailBack'), viewTailFront = $('viewTailFront'), viewTailBackLayer = $('viewTailBackLayer'), viewTailFrontLayer = $('viewTailFrontLayer');
  const cometFlowLayer=$('cometFlowLayer'),cometFlowGlow=$('cometFlowGlow'),cometFlowUpper=$('cometFlowUpper'),cometFlowLower=$('cometFlowLower');
  const eyeLShadow = $('eyeLShadow'), eyeRShadow = $('eyeRShadow'), mouthShadow = $('mouthShadow');
  const eyeLBloom = $('eyeLBloom'), eyeRBloom = $('eyeRBloom'), mouthBloom = $('mouthBloom');
  const eyeLRecess = $('eyeLRecess'), eyeRRecess = $('eyeRRecess'), mouthRecess = $('mouthRecess');
  const debug = $('debug'), debugEdges = $('debugEdges'), debugPoints = $('debugPoints'), faceAnchorDebug = $('faceAnchorDebug');

  const coupling = $('coupling'), motion = $('motion'), interiorEnergy = $('interiorEnergy'), yaw = $('yaw');
  const fixedIdlePhaseRaw = query.get('idlePhase');
  const fixedIdlePhase = fixedIdlePhaseRaw===null?null:Math.max(0,Math.min(1,Number(fixedIdlePhaseRaw)||0));
  const reducedMotionQuery = query.get('reduced')==='1';
  const reducedMotionMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = reducedMotionQuery || reducedMotionMedia.matches;
  const proofMode = query.get('proof')==='1';
  let proofFramePending = false;
  function requestRuntimeFrame(){if(!proofMode)return;if(proofFramePending)return;proofFramePending=true;requestAnimationFrame(render);}
  document.documentElement.dataset.motionMode = reducedMotion?'static':'native-idle';
  document.documentElement.dataset.runtimeLoop = proofMode?'on-demand-proof':'continuous';
  const requestedEmotion=EMOTION_FAMILIES[query.get('emotion')]?query.get('emotion'):'neutral';
  const requestedFixture=EMOTION_FIXTURES[query.get('fixture')]?query.get('fixture'):EMOTION_FAMILIES[requestedEmotion][0];
  let state = requestedFixture;
  let emotionFamily = EMOTION_FIXTURES[state].family;
  let fixtureIndex = EMOTION_FAMILIES[emotionFamily]?.indexOf(state) ?? 0;
  let transitionFromFixture = state;
  let transitionToFixture = state;
  let transitionStartedAt = performance.now();
  let transitionDuration = EMOTION_FIXTURES[state].transitionSeconds;
  let transitionSerial = 0;
  let interruptionCount = 0;
  let emotionDemoMode = query.get('emotionDemo')==='1';
  let emotionDemoIndex = Math.max(0,EMOTION_DEMO_SEQUENCE.indexOf(state));
  let emotionDemoClock = 0;
  let runtimeDormant = false;
  let preDormantProfile = 'presence';
  let silhouetteProfile = FORM_PROFILES[query.get('geometry')]?query.get('geometry'):'presence';
  let materialProfile = query.get('material')==='baseline'?'baseline':'master';
  let previewSize = [96,160,240,320,480,720].includes(Number(query.get('preview')))?Number(query.get('preview')):320;
  const DEMO_SEQUENCE = Object.freeze(['presence','low-orbit','comet','singularity','dormant-orbit','wispwalker','halo','lantern']);
  const DEMO_HOLD_SECONDS = 3.2;
  const DEMO_MORPH_SECONDS = 1.8;
  let demoMode = query.get('demo')==='1';
  let manualMorph = null;
  const requestedMorphFrom=query.get('morphFrom'),requestedMorphTo=query.get('morphTo'),requestedMorphMix=query.get('morphMix');
  if(FORM_PROFILES[requestedMorphFrom]&&FORM_PROFILES[requestedMorphTo]&&requestedMorphMix!==null){manualMorph={from:requestedMorphFrom,to:requestedMorphTo,mix:Math.max(0,Math.min(1,Number(requestedMorphMix)||0))};demoMode=false;}
  let detailTier = ['low','high','adaptive'].includes(query.get('detail'))?query.get('detail'):'adaptive';
  let reliefPreset = Object.hasOwn(RELIEF_PRESETS,query.get('relief'))?query.get('relief'):'none';
  let containmentMode = ['all','contained','aura'].includes(query.get('containment'))?query.get('containment'):'all';
  let activeReliefSamples = 0;
  const METRIC_WINDOW = 720;
  const frameMetrics = {frames:0,scriptMs:[],topologyMs:[],normalMs:[],reliefMs:[],reliefEvaluationMs:[],reliefNormalMs:[],svgMs:[],frameIntervalMs:[],longTasks:0,droppedFrames:0,lastFrameAt:0};
  if('PerformanceObserver' in globalThis){try{new PerformanceObserver(list=>{frameMetrics.longTasks+=list.getEntries().length;}).observe({entryTypes:['longtask']});}catch{}}
  function clampYaw(value){return Math.max(AUTHORED_YAW_RANGE[0],Math.min(AUTHORED_YAW_RANGE[1],Number(value)||0));}
  let viewYawDegrees = clampYaw(query.get('yaw'));
  yaw.value=String(viewYawDegrees);
  let current = {...EMOTION_FIXTURES[state]};
  let target = {...EMOTION_FIXTURES[state]};
  let preDormantFixture = state;
  let preDormantFamily = emotionFamily;
  let activeMicrostate = null;
  let activeFixtureBlend = null;
  let behaviorMorphSerial = 0;
  let conversationSerial = 0;
  let laggedEnergy = current.energy;
  let behaviorProgress = 0;
  let behaviorMorphStatus = 'idle';
  let activeReliefMode = 'none';
  let paused = false, debugOn = false, selectedVertex = -1, lastPoints = [], lastMeshPoints = [];
  const meshOffsets = Array.from({length:STRUCTURAL_NODES},()=>({x:0,y:0}));
  let dragOrigin = null;
  let lastTime = performance.now(), elapsed = 0, lastAuto = performance.now();
  let demoIndex = Math.max(0, DEMO_SEQUENCE.indexOf(silhouetteProfile));
  let demoLastPhase = 0;
  if(query.has('motion'))motion.value=String(Math.max(0,Math.min(1,Number(query.get('motion'))||0)));
  if(query.has('energy'))interiorEnergy.value=String(Math.max(.15,Math.min(1.25,Number(query.get('energy'))||.72)));

  function emotionFixture(id){const fixture=EMOTION_FIXTURES[id];if(!fixture)throw new TypeError('unknown emotion fixture');return fixture;}
  function transitionProgress(now=performance.now()){const elapsedMs=Math.max(0,now-transitionStartedAt),durationMs=Math.max(1,transitionDuration*1000);return Math.max(0,Math.min(1,elapsedMs/durationMs));}
  function renderEmotionButtons(){document.querySelectorAll('[data-emotion]').forEach(button=>{button.classList.toggle('active',button.dataset.emotion===emotionFamily);button.onclick=()=>setEmotionFamily(button.dataset.emotion,0,{source:'ui'});});}
  function renderFixtureButtons(){const host=$('fixtureButtons'),ids=EMOTION_FAMILIES[emotionFamily]||[];host.replaceChildren(...ids.map((id,index)=>{const fixture=EMOTION_FIXTURES[id],button=document.createElement('button');button.type='button';button.dataset.fixture=id;button.textContent=fixture.label;button.classList.toggle('active',id===state);button.onclick=()=>setEmotionFixture(id,{source:'ui'});return button;}));}
  function updateRuntimeLabels(now=performance.now()){$('runtimeEmotion').textContent=emotionFamily[0].toUpperCase()+emotionFamily.slice(1);$('runtimeFixture').textContent=EMOTION_FIXTURES[state].label;const p=transitionProgress(now),active=p<.999&&transitionFromFixture!==transitionToFixture;$('runtimeTransition').textContent=runtimeDormant?'Dormant embodiment':active?`${EMOTION_FIXTURES[transitionFromFixture].label} → ${EMOTION_FIXTURES[transitionToFixture].label}`:'Holding fixture';$('runtimeInterruptions').textContent=`${interruptionCount} interruption${interruptionCount===1?'':'s'}`;$('runtimeTransitionBar').style.width=`${(p*100).toFixed(1)}%`;$('emotionDemo').textContent=emotionDemoMode?'Stop emotion sequence':'Play emotion sequence';updateBehaviorLabels();}
  function applyEmotionRelief(fixture){if(Object.hasOwn(RELIEF_PRESETS,fixture.reliefMode))setReliefPreset(fixture.reliefMode);}
  function setEmotionFixture(id,{source='runtime',interrupted=false}={}){const fixture=emotionFixture(id),previous=state;activeFixtureBlend=null;if(previous===id&&transitionProgress()>.999)return;const wasTransitioning=transitionProgress()<.999&&transitionFromFixture!==transitionToFixture;if(interrupted||wasTransitioning)interruptionCount+=1;transitionFromFixture=previous;transitionToFixture=id;transitionStartedAt=performance.now();transitionDuration=Math.max(.24,fixture.transitionSeconds||.72);transitionSerial+=1;state=id;emotionFamily=fixture.family;fixtureIndex=EMOTION_FAMILIES[emotionFamily]?.indexOf(id) ?? 0;target={...fixture};applyEmotionRelief(fixture);runtimeDormant=false;renderEmotionButtons();renderFixtureButtons();updateRuntimeLabels();avatar.dataset.emotion=emotionFamily;avatar.dataset.fixture=id;avatar.dataset.transitionSerial=String(transitionSerial);requestRuntimeFrame();}
  function setEmotionFamily(family,index=0,options={}){if(!EMOTION_FAMILIES[family])throw new TypeError('unknown emotion family');const ids=EMOTION_FAMILIES[family],safeIndex=Math.max(0,Math.min(ids.length-1,Number(index)||0));setEmotionFixture(ids[safeIndex],options);}
  function interruptEmotion(family='blocked',index=0){setEmotionFamily(family,index,{source:'interrupt',interrupted:true});}
  function enterDormant(profileId='dormant-orbit'){if(!['dormant-orbit','singularity'].includes(profileId))throw new TypeError('unsupported dormant profile');preDormantProfile=silhouetteProfile;preDormantFixture=state;preDormantFamily=emotionFamily;manualMorph=null;demoMode=false;silhouetteProfile=profileId;runtimeDormant=true;emotionDemoMode=false;applyFormPresence();applyLayerVisibility();renderSilhouetteProfileButtons();updateRuntimeLabels();requestRuntimeFrame();}
  function wakePresence(){manualMorph=null;demoMode=false;silhouetteProfile=preDormantProfile&&FORM_PROFILES[preDormantProfile]&&!['singularity','dormant-orbit'].includes(preDormantProfile)?preDormantProfile:'presence';runtimeDormant=false;setEmotionFixture(EMOTION_FIXTURES[preDormantFixture]?preDormantFixture:'neutral-social',{source:'wake',interrupted:true});applyFormPresence();applyLayerVisibility();renderSilhouetteProfileButtons();triggerMicrostate('wake',{strength:.8});}
  function microstateEnvelope(seconds){if(!activeMicrostate)return 0;if(activeMicrostate.manualProgress!==null)return Math.sin(Math.PI*Math.max(0,Math.min(1,activeMicrostate.manualProgress)))*activeMicrostate.strength;const progress=Math.max(0,(seconds-activeMicrostate.startedAtSeconds)/(activeMicrostate.durationMs/1000));behaviorProgress=Math.min(1,progress);if(progress>=1){activeMicrostate=null;behaviorProgress=0;return 0;}return Math.sin(Math.PI*progress)*activeMicrostate.strength;}
  function applyMicrostateToState(st,seconds){const amount=microstateEnvelope(seconds);if(!activeMicrostate||amount<=0)return{...st};const schema=MICROSTATE_SCHEMA[activeMicrostate.id],out={...st};for(const [key,delta] of Object.entries(schema.deltas))if(typeof out[key]==='number')out[key]+=delta*amount;return out;}
  function adaptFixtureToEmbodiment(st,fromId,toId,mix){const out={...st},low=profileWeight(fromId,toId,mix,'low-orbit'),comet=profileWeight(fromId,toId,mix,'comet'),wisp=profileWeight(fromId,toId,mix,'wispwalker'),halo=profileWeight(fromId,toId,mix,'halo'),lantern=profileWeight(fromId,toId,mix,'lantern'),dormant=Math.max(profileWeight(fromId,toId,mix,'singularity'),profileWeight(fromId,toId,mix,'dormant-orbit'));out.eyeOpenL*=1+.10*low+.035*comet-.08*dormant;out.eyeOpenR*=1+.10*low+.045*comet-.08*dormant;out.eyeWidthL*=1+.035*low+.025*comet;out.eyeWidthR*=1+.035*low+.025*comet;out.mouthOpen*=1+.06*low+.08*comet-.28*dormant;out.mouthCurve+=.025*low+.018*wisp+.015*lantern;out.postureY+=.22*low-.18*comet-.10*lantern;out.postureX+=.18*comet+.08*wisp;out.crown+=.02*halo+.035*lantern;out.motionGain*=1-.34*dormant+.06*wisp+.05*comet;out.energy*=1-.26*dormant+.04*halo+.05*lantern;return out;}
  function composeFixtureMotion(st,seconds,motionStrength){st=applyMicrostateToState(st,seconds);const seed=st.microSeed||1,tempo=st.tempo||1,gain=(st.motionGain??.7)*motionStrength,a=Math.sin(seconds*.43*tempo+seed*1.91),b=Math.sin(seconds*.67*tempo+seed*.73),c=Math.cos(seconds*.31*tempo+seed*2.37);return{...st,eyeLiftL:st.eyeLiftL+gain*(.18*a+.07*c),eyeLiftR:st.eyeLiftR+gain*(.16*b-.06*c),eyeOpenL:Math.max(.015,st.eyeOpenL+gain*.008*b),eyeOpenR:Math.max(.015,st.eyeOpenR+gain*.008*a),mouthCurve:st.mouthCurve+gain*.010*c,mouthSkew:st.mouthSkew+gain*.015*a,asym:st.asym+gain*.012*b,crown:st.crown+gain*.008*a,energy:Math.max(.15,st.energy+gain*.018*c),postureX:st.postureX+gain*.20*a,postureY:st.postureY+gain*.14*b};}
  function blendFixtureState(fromId,toId,mix){const a=emotionFixture(fromId),b=emotionFixture(toId),out={...a,id:mix<.5?fromId:toId,family:mix<.5?a.family:b.family,label:mix<.5?a.label:b.label,note:mix<.5?a.note:b.note,reliefMode:mix<.5?a.reliefMode:b.reliefMode};for(const key of Object.keys(a))if(typeof a[key]==='number'&&typeof b[key]==='number')out[key]=lerp(a[key],b[key],mix);return out;}
  function setFixtureImmediate(id){const fixture=emotionFixture(id);activeFixtureBlend=null;state=id;emotionFamily=fixture.family;fixtureIndex=EMOTION_FAMILIES[emotionFamily]?.indexOf(id) ?? 0;transitionFromFixture=id;transitionToFixture=id;transitionDuration=fixture.transitionSeconds;transitionStartedAt=performance.now()-transitionDuration*1000;current={...fixture};target={...fixture};applyEmotionRelief(fixture);runtimeDormant=false;renderEmotionButtons();renderFixtureButtons();updateRuntimeLabels();avatar.dataset.emotion=emotionFamily;avatar.dataset.fixture=id;requestRuntimeFrame();}
  function setExpressionPreview(fromId,toId,mix){activeFixtureBlend=null;const clamped=Math.max(0,Math.min(1,Number(mix)||0)),blended=blendFixtureState(fromId,toId,clamped),displayId=clamped<.5?fromId:toId;state=displayId;emotionFamily=EMOTION_FIXTURES[displayId].family;fixtureIndex=EMOTION_FAMILIES[emotionFamily]?.indexOf(displayId) ?? 0;transitionFromFixture=fromId;transitionToFixture=toId;transitionDuration=1;transitionStartedAt=performance.now()-clamped*1000;current={...blended};target={...blended};applyEmotionRelief(blended);renderEmotionButtons();renderFixtureButtons();updateRuntimeLabels();requestRuntimeFrame();}
  function allowedTransition(fromFamily,toFamily){return fromFamily===toFamily||(EMOTION_TRANSITION_GRAPH[fromFamily]||[]).includes(toFamily);}
  function normalizedBlendWeights(family,weights){const ids=EMOTION_FAMILIES[family];if(!ids)throw new TypeError('unknown emotion family');const source=Array.isArray(weights)?weights:ids.map(id=>Number(weights?.[id]??0));const clean=source.map(value=>Math.max(0,Number(value)||0));let total=clean.reduce((sum,value)=>sum+value,0);if(total<=0){clean[0]=1;total=1;}return clean.map(value=>value/total);}
  function blendFixtureWeights(family,weights){const ids=EMOTION_FAMILIES[family],norm=normalizedBlendWeights(family,weights),base={...EMOTION_FIXTURES[ids[0]]};for(const key of Object.keys(base)){if(typeof base[key]==='number')base[key]=ids.reduce((sum,id,index)=>sum+(Number(EMOTION_FIXTURES[id][key])||0)*norm[index],0);}const dominantIndex=norm.indexOf(Math.max(...norm)),dominantId=ids[dominantIndex];return{state:{...base,id:dominantId,family,label:`Blend · ${EMOTION_FIXTURES[dominantId].label}`,note:'Weighted semantic fixture blend.',reliefMode:EMOTION_FIXTURES[dominantId].reliefMode},ids,weights:norm,dominantId};}
  function setFixtureBlend(family,weights,{interrupted=true,source='behavior'}={}){const blend=blendFixtureWeights(family,weights),wasTransitioning=transitionProgress()<.999&&transitionFromFixture!==transitionToFixture;if(interrupted||wasTransitioning)interruptionCount+=1;transitionFromFixture=state;transitionToFixture=blend.dominantId;transitionStartedAt=performance.now();transitionDuration=.62;transitionSerial+=1;state=blend.dominantId;emotionFamily=family;fixtureIndex=EMOTION_FAMILIES[family].indexOf(state);target={...blend.state};activeFixtureBlend={family,ids:blend.ids,weights:blend.weights,dominantId:blend.dominantId,source};applyEmotionRelief(blend.state);runtimeDormant=false;renderEmotionButtons();renderFixtureButtons();renderFixtureBlendControls();updateRuntimeLabels();avatar.dataset.emotion=family;avatar.dataset.fixture=state;avatar.dataset.fixtureBlend='true';requestRuntimeFrame();return getBehaviorState();}
  function triggerMicrostate(id,{strength=1,durationMs,progress=null}={}){const schema=MICROSTATE_SCHEMA[id];if(!schema)throw new TypeError('unknown microstate');activeMicrostate={id,strength:Math.max(0,Math.min(2,Number(strength)||1)),durationMs:Math.max(80,Number(durationMs)||schema.durationMs),startedAtSeconds:elapsed,manualProgress:progress===null?null:Math.max(0,Math.min(1,Number(progress)||0))};behaviorProgress=progress===null?0:activeMicrostate.manualProgress;avatar.dataset.microstate=id;updateBehaviorLabels();requestRuntimeFrame();return getBehaviorState();}
  function setMicrostateProgress(id,progress,strength=1){return triggerMicrostate(id,{strength,durationMs:1000,progress});}
  function clearMicrostate(){activeMicrostate=null;behaviorProgress=0;delete avatar.dataset.microstate;updateBehaviorLabels();requestRuntimeFrame();return getBehaviorState();}
  function getBehaviorState(){return{version:'6.5.5',microstate:activeMicrostate?{...activeMicrostate}:null,fixtureBlend:activeFixtureBlend?{...activeFixtureBlend,weights:[...activeFixtureBlend.weights]}:null,preDormant:{profile:preDormantProfile,family:preDormantFamily,fixture:preDormantFixture},morphStatus:behaviorMorphStatus,morphSerial:behaviorMorphSerial,conversationSerial,progress:behaviorProgress,laggedEnergy,runtimeDormant};}
  function renderFixtureBlendControls(){const host=$('fixtureBlendControls');if(!host)return;const ids=EMOTION_FAMILIES[emotionFamily]||[],active=activeFixtureBlend?.family===emotionFamily?activeFixtureBlend.weights:ids.map(id=>id===state?1:0);host.replaceChildren(...ids.map((id,index)=>{const row=document.createElement('label');row.className='blend-row';const name=document.createElement('span');name.textContent=EMOTION_FIXTURES[id].label;const input=document.createElement('input');input.type='range';input.min='0';input.max='1';input.step='.01';input.value=String(active[index]??0);input.dataset.blendIndex=String(index);const value=document.createElement('span');value.textContent=Number(input.value).toFixed(2);input.oninput=()=>{value.textContent=Number(input.value).toFixed(2);const values=[...host.querySelectorAll('input')].map(node=>Number(node.value));setFixtureBlend(emotionFamily,values,{interrupted:false,source:'ui'});};row.append(name,input,value);return row;}));}
  function renderBehaviorControls(){const host=$('microstateButtons');if(host)host.replaceChildren(...MICROSTATE_ORDER.slice(0,9).map(id=>{const button=document.createElement('button');button.type='button';button.textContent=MICROSTATE_SCHEMA[id].label;button.dataset.microstate=id;button.onclick=()=>triggerMicrostate(id);return button;}));renderFixtureBlendControls();updateBehaviorLabels();}
  function updateBehaviorLabels(){const micro=$('behaviorMicrostate'),blend=$('behaviorBlend'),memory=$('behaviorMemory'),morph=$('behaviorMorph'),bar=$('behaviorProgress');if(micro)micro.textContent=activeMicrostate?MICROSTATE_SCHEMA[activeMicrostate.id].label:'none';if(blend)blend.textContent=activeFixtureBlend?`${activeFixtureBlend.family} · ${activeFixtureBlend.weights.map(v=>v.toFixed(2)).join('/')}`:'fixture endpoint';if(memory)memory.textContent=`${preDormantFamily} · ${preDormantFixture}`;if(morph)morph.textContent=behaviorMorphStatus;if(bar)bar.style.width=`${Math.max(0,Math.min(1,behaviorProgress))*100}%`;}
  function sleep(ms){return new Promise(resolve=>setTimeout(resolve,Math.max(0,ms)));}
  function directEmbodimentRoute(from,to){return from===to||(EMBODIMENT_TRANSITION_GRAPH[from]||[]).includes(to);}
  function routeEmbodiments(from,to){if(from===to)return[];if(directEmbodimentRoute(from,to))return[to];if(from==='singularity')return['dormant-orbit',...(to==='dormant-orbit'?[]:routeEmbodiments('dormant-orbit',to))];if(to==='singularity')return[...(from==='dormant-orbit'?[]:routeEmbodiments(from,'dormant-orbit')),'singularity'];if(from!=='presence'&&to!=='presence')return['presence',to];return[to];}
  function easeBehavior(t,easing='smooth'){if(easing==='linear')return t;if(easing==='soft')return t*t*(3-2*t);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
  function animateMorphPreview(from,to,startMix,endMix,durationMs,serial,easing='smooth'){return new Promise(resolve=>{const started=performance.now();function step(now){if(serial!==behaviorMorphSerial)return resolve({cancelled:true});const p=Math.max(0,Math.min(1,(now-started)/Math.max(1,durationMs))),mix=lerp(startMix,endMix,easeBehavior(p,easing));globalThis.SidekickFormMasterRig.setMorphPreview(from,to,mix);behaviorProgress=p;updateBehaviorLabels();if(p<1)requestAnimationFrame(step);else resolve({cancelled:false});}requestAnimationFrame(step);});}
  async function morphToBehavioral(name,{durationMs=980,easing='smooth'}={}){if(!FORM_PROFILES[name])throw new TypeError('unknown embodiment');const serial=++behaviorMorphSerial;gasperMorphSerial+=1;conversationSerial+=1;let snapshot=globalThis.SidekickFormMasterRig.getSnapshot();behaviorMorphStatus='retargeting';updateBehaviorLabels();let from=snapshot.profile;if(snapshot.morph){const morph=snapshot.morph,settleTo=morph.mix<.5?morph.from:morph.to,end=morph.mix<.5?0:1;behaviorMorphStatus=`recover ${morph.from} ↔ ${morph.to}`;const recovered=await animateMorphPreview(morph.from,morph.to,morph.mix,end,Math.max(160,durationMs*.28),serial,'soft');if(recovered.cancelled)return getBehaviorState();globalThis.SidekickFormMasterRig.clearMorphPreview();globalThis.SidekickFormMasterRig.setProfile(settleTo);from=settleTo;}const route=routeEmbodiments(from,name);if(!route.length){behaviorMorphStatus='idle';behaviorProgress=0;updateBehaviorLabels();return gasperMetadata();}const segmentDuration=Math.max(260,durationMs/route.length);let cursor=from;for(const step of route){if(serial!==behaviorMorphSerial)return getBehaviorState();behaviorMorphStatus=`${cursor} → ${step}`;const result=await animateMorphPreview(cursor,step,0,1,segmentDuration,serial,easing);if(result.cancelled)return getBehaviorState();globalThis.SidekickFormMasterRig.clearMorphPreview();globalThis.SidekickFormMasterRig.setProfile(step);cursor=step;}behaviorMorphStatus='idle';behaviorProgress=0;updateBehaviorLabels();gasperEmit('behavioralsettled',{embodiment:name,route});return gasperMetadata();}
  async function enterDormantBehavior(profileId='dormant-orbit',{durationMs=1250}={}){if(!['dormant-orbit','singularity'].includes(profileId))throw new TypeError('unsupported dormant profile');const snapshot=globalThis.SidekickFormMasterRig.getSnapshot();preDormantProfile=snapshot.morph?(snapshot.morph.mix<.5?snapshot.morph.from:snapshot.morph.to):snapshot.profile;preDormantFixture=state;preDormantFamily=emotionFamily;const route=DORMANT_ENTRY_ROUTES[emotionFamily]||DORMANT_ENTRY_ROUTES.neutral;setEmotionFixture(route.fixture,{source:'dormant-entry',interrupted:true});runtimeDormant=true;triggerMicrostate(route.microstate,{strength:.78,durationMs:Math.min(900,durationMs*.68)});updateRuntimeLabels();await sleep(90);await morphToBehavioral(profileId,{durationMs});runtimeDormant=true;clearMicrostate();updateRuntimeLabels();gasperEmit('dormantentered',{profile:profileId,prior:{profile:preDormantProfile,family:preDormantFamily,fixture:preDormantFixture}});return gasperMetadata();}
  async function wakeBehavior({durationMs=1250,profile}={}){const targetProfile=profile||(FORM_PROFILES[preDormantProfile]&&!['singularity','dormant-orbit'].includes(preDormantProfile)?preDormantProfile:'presence'),restoreFixture=EMOTION_FIXTURES[preDormantFixture]?preDormantFixture:(EMOTION_FAMILIES[preDormantFamily]?.[0]||'neutral-social');runtimeDormant=false;const morphPromise=morphToBehavioral(targetProfile,{durationMs});await sleep(Math.max(120,durationMs*.42));setEmotionFixture(restoreFixture,{source:'wake-context',interrupted:true});triggerMicrostate('wake',{strength:.85,durationMs:Math.max(500,durationMs*.68)});await morphPromise;gasperEmit('wakerestored',{profile:targetProfile,family:preDormantFamily,fixture:restoreFixture});return gasperMetadata();}
  async function runConversationSequence({stepMs=650}={}){const serial=++conversationSerial;const sequence=[['neutral-social','acknowledge'],['listening-orient','orient'],['listening-hold',null],['thinking-scan','processing'],['thinking-resolve','reconsider'],['pleased-contained','response'],['listening-receive','acknowledge'],['neutral-wry','amusement']];for(const [fixture,micro] of sequence){if(serial!==conversationSerial)return getBehaviorState();setEmotionFixture(fixture,{source:'conversation',interrupted:true});if(micro)triggerMicrostate(micro,{durationMs:stepMs*.82});await sleep(stepMs);}clearMicrostate();gasperEmit('conversationcomplete',{serial});return gasperMetadata();}
  function cancelBehavior(){behaviorMorphSerial+=1;conversationSerial+=1;behaviorMorphStatus='idle';behaviorProgress=0;clearMicrostate();updateBehaviorLabels();return getBehaviorState();}
  function gaussAngle(theta, mu, sigma){ let d = (theta - mu + Math.PI) % (2*Math.PI) - Math.PI; return Math.exp(-0.5*Math.pow(d/sigma,2)); }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function smoothstep(a,b,x){ if(x<=a)return 0;if(x>=b)return 1;const t=(x-a)/(b-a);return t*t*(3-2*t); }
  function viewAmount(){return viewYawDegrees/AUTHORED_YAW_RANGE[1];}
  function authoredTurnEase(){const t=viewAmount();return t*t*(3-2*t);}
  function formProjectionFrame(profile){
    if(profile.projectionFrame)return profile.projectionFrame;
    if(profile.geometryModel==='ground-tangent-puddle')return{cx:120,cy:136,rx:105,ry:42};
    if(profile.geometryModel==='forward-mass-attached-wake')return{cx:132,cy:108,rx:118,ry:66};
    if(profile.geometryModel==='dormant-family'){const collapse=Math.max(0,Math.min(1,profile.dormantCollapse||0));return{cx:120,cy:111.5,rx:lerp(80,105,collapse),ry:lerp(76,47,collapse)};}
    return{cx:120+profile.cx,cy:110+profile.cy,rx:82*profile.sx,ry:84*profile.sy};
  }
  function authorKeyViewPoint(point,profile,surfaceInfluence=1){
    const frame=formProjectionFrame(profile),cx=frame.cx,cy=frame.cy,lifted=liftSurfacePoint(point,profile);
    if(viewYawDegrees===0)return{...point,sourceX:point.x,sourceY:point.y,latentDepth:0,projectedDepth:0};
    const turn=authoredTurnEase(),nx=lifted.objectX/frame.rx,ny=lifted.objectY/frame.ry;
    const verticalEnvelope=Math.pow(Math.max(0,1-Math.abs(ny)),.72),interiorEnvelope=Math.max(0,1-Math.hypot(nx,ny));
    const lobeBand=Math.exp(-.5*Math.pow(ny/.32,2)),identityShift=1.2*turn*verticalEnvelope;
    const nearExpansion=7.0*turn*Math.pow(Math.max(0,nx),.78)*lobeBand,farTuck=3.0*turn*Math.pow(Math.max(0,-nx),.78)*lobeBand;
    const crownBias=1.4*turn*Math.max(0,-ny)*(1-Math.min(1,Math.abs(nx))),depthParallax=lifted.latentDepth*.12*turn*surfaceInfluence;
    const anchorX=point.x+identityShift+nearExpansion+farTuck+crownBias+depthParallax;
    const anchorY=point.y+1.55*turn*nx*verticalEnvelope+.75*turn*ny*interiorEnvelope;
    return{...point,sourceX:point.x,sourceY:point.y,objectX:lifted.objectX,objectY:lifted.objectY,latentDepth:lifted.latentDepth,projectedDepth:lifted.latentDepth*(1-.18*turn)-lifted.objectX*.45*turn,x:lerp(point.x,anchorX,surfaceInfluence),y:lerp(point.y,anchorY,surfaceInfluence),anchorX,anchorY};
  }
  function getViewMetrics(profile=FORM_PROFILES[silhouetteProfile]){
    const frame=formProjectionFrame(profile),amount=viewAmount(),faceCenter=authorKeyViewPoint({x:frame.cx,y:frame.cy+1},profile,1);
    const rawFaceShift=faceCenter.x-frame.cx+5*authoredTurnEase(),faceShift=Math.max(-18,Math.min(18,rawFaceShift));
    return{yaw:viewYawDegrees,amount,faceShift,faceCompression:1-.16*amount,nearLobeScale:1+.09*amount,farLobeScale:1-.16*amount,tailOpacity:0,discPerspective:.92-.20*amount,viewDepthRole:viewYawDegrees<12?'front-symmetric':'right-near-left-far',projection:'authored-anchor-harmonic-interpolation',projectedFaceDepth:faceCenter.projectedDepth};
  }
  function idleCycleAt(seconds){
    const phase=((seconds/IDLE_CYCLE_SECONDS)%1+1)%1;
    const breath=(1-Math.cos(phase*Math.PI*2))*.5;
    const driftX=Math.sin(phase*Math.PI*2)*.9;
    const liftY=-1.2*breath+.14*Math.sin(phase*Math.PI*4);
    const blinkDistance=Math.abs(((phase-.70+.5)%1+1)%1-.5);
    const blinkWindow=Math.max(0,1-blinkDistance/.028);
    const blink=Math.pow(Math.sin(blinkWindow*Math.PI*.5),2);
    return {
      phase, breath, driftX, liftY, blink,
      scaleX:1-.003*breath,
      scaleY:1+.010*breath,
      reflectionX:Math.sin((phase-.10)*Math.PI*2)*2.2,
      reflectionY:Math.cos((phase-.10)*Math.PI*2)*.75,
      lobeLag:Math.sin((phase-.17)*Math.PI*2)*.75,
      reservoirX:Math.sin((phase+.22)*Math.PI*2)*1.5,
      reservoirY:Math.cos((phase+.22)*Math.PI*2)*1.15
    };
  }
  function rotate(x,y,cx,cy,deg){ const r=deg*Math.PI/180,dx=x-cx,dy=y-cy;return{x:cx+dx*Math.cos(r)-dy*Math.sin(r),y:cy+dx*Math.sin(r)+dy*Math.cos(r)}; }
  function splineSegments(pts){ if(pts.length<2)return'';let s='';for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];const c1x=p1.x+(p2.x-p0.x)/6,c1y=p1.y+(p2.y-p0.y)/6,c2x=p2.x-(p3.x-p1.x)/6,c2y=p2.y-(p3.y-p1.y)/6;s+=` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;}return s; }
  function closedSpline(pts){ let d=`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;const n=pts.length;for(let i=0;i<n;i++){const p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n];const c1x=p1.x+(p2.x-p0.x)/6,c1y=p1.y+(p2.y-p0.y)/6,c2x=p2.x-(p3.x-p1.x)/6,c2y=p2.y-(p3.y-p1.y)/6;d+=` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;}return d+' Z'; }
  function openSpline(pts){ return pts.length ? `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}` + splineSegments(pts) : ''; }

  function baseRadiusV61(th){
    let baseRadius=70.5;
    baseRadius+=6.0*gaussAngle(th,-Math.PI/2,0.80);
    for(const mu of [0,Math.PI]){baseRadius+=10.5*gaussAngle(th,mu,0.12);baseRadius-=7.2*gaussAngle(th,mu-0.24,0.08);baseRadius-=7.2*gaussAngle(th,mu+0.24,0.08);}
    baseRadius-=2.0*(gaussAngle(th,0.82,0.20)+gaussAngle(th,2.32,0.20));
    for(const mu of [1.28,1.86])baseRadius+=7.2*gaussAngle(th,mu,0.075);
    baseRadius-=4.8*gaussAngle(th,Math.PI/2,0.10);baseRadius-=2.2*(gaussAngle(th,1.10,0.08)+gaussAngle(th,2.04,0.08));
    return baseRadius;
  }
  function baseRadiusV62(th){
    let baseRadius=71.8;
    baseRadius+=4.2*gaussAngle(th,-Math.PI/2,0.78);
    baseRadius+=2.8*gaussAngle(th,Math.PI/2,0.74);
    baseRadius+=2.8*(gaussAngle(th,0.58,0.42)+gaussAngle(th,2.56,0.42));
    for(const mu of [0,Math.PI]){baseRadius+=5.2*gaussAngle(th,mu,0.13);baseRadius-=3.4*gaussAngle(th,mu-0.23,0.09);baseRadius-=3.4*gaussAngle(th,mu+0.23,0.09);}
    for(const mu of [1.31,1.83])baseRadius+=2.8*gaussAngle(th,mu,0.075);
    baseRadius-=1.3*gaussAngle(th,Math.PI/2,0.11);
    baseRadius+=0.75*gaussAngle(th,-0.38,0.46)-0.42*gaussAngle(th,Math.PI+0.34,0.48);
    return baseRadius;
  }
  function baseRadiusV63(th){
    let baseRadius=72.0;
    baseRadius+=5.1*gaussAngle(th,-Math.PI/2,0.82);
    baseRadius+=1.7*gaussAngle(th,Math.PI/2,0.76);
    baseRadius+=1.4*(gaussAngle(th,0.72,0.38)+gaussAngle(th,2.42,0.38));
    for(const mu of [0,Math.PI]){baseRadius+=6.5*(gaussAngle(th,mu-.09,.15)+gaussAngle(th,mu+.09,.15));baseRadius-=3.8*gaussAngle(th,mu-.31,.11);baseRadius-=3.8*gaussAngle(th,mu+.31,.11);}
    baseRadius-=0.45*gaussAngle(th,Math.PI/2,0.18);
    baseRadius+=0.52*gaussAngle(th,-0.34,0.48)-0.28*gaussAngle(th,Math.PI+0.30,0.48);
    return baseRadius;
  }
  function formRadiusAtFor(profileId,th){
    let radius=baseRadiusV63(th);
    if(profileId==='singularity'){
      radius-=1.1;
      radius+=1.8*(gaussAngle(th,0,.18)+gaussAngle(th,Math.PI,.18));
      return radius;
    }
    if(profileId==='dormant-orbit'){
      radius-=.55;
      radius+=2.8*(gaussAngle(th,0,.17)+gaussAngle(th,Math.PI,.17));
      return radius;
    }
    if(profileId==='wispwalker'){
      radius+=4.8*(gaussAngle(th,1.27,.145)+gaussAngle(th,1.87,.145));
      radius+=2.7*(gaussAngle(th,1.10,.285)+gaussAngle(th,2.04,.285));
      radius-=1.65*gaussAngle(th,Math.PI/2,.155);
    }else if(profileId==='comet'){
      radius-=2.4;
      radius+=3.8*gaussAngle(th,0,.52)-1.2*gaussAngle(th,Math.PI,.62);
      radius-=0.8*gaussAngle(th,Math.PI/2,.28);
    }else if(profileId==='halo'){
      radius-=1.4;
      radius+=4.2*(gaussAngle(th,0,.38)+gaussAngle(th,Math.PI,.38));
      radius-=2.5*(gaussAngle(th,.58,.20)+gaussAngle(th,2.56,.20));
    }else if(profileId==='lantern'){
      radius-=2.2;
      radius+=4.2*gaussAngle(th,-Math.PI/2,.62);
      radius+=8.7*gaussAngle(th,Math.PI/2,.22);
      radius-=3.4*(gaussAngle(th,.66,.30)+gaussAngle(th,2.48,.30));
    }else if(profileId==='low-orbit'){
      radius-=3.6;
      radius+=2.6*gaussAngle(th,Math.PI/2,.82);
      radius+=1.5*(gaussAngle(th,1.02,.42)+gaussAngle(th,2.12,.42));
    }
    return radius;
  }
  function formRadiusAt(th){return formRadiusAtFor(silhouetteProfile,th);}
  function baseRadiusAtFor(profileId,th){return formRadiusAtFor(profileId,th);}
  function baseRadiusAt(th){return baseRadiusAtFor(silhouetteProfile,th);}
  function signedPow(value,exponent){return Math.sign(value)*Math.pow(Math.abs(value),exponent);}
  function mapLowOrbitPuddle(th,radiusScale=1){
    const cos=Math.cos(th),sin=Math.sin(th);
    const stableScale=1+(radiusScale-1)*.34;
    const width=107.5*stableScale,topHeight=41.5*stableScale,bottomHeight=12.4*stableScale;
    const xNorm=signedPow(cos,.78);
    const lowerBlend=smoothstep(-.24,.24,sin);
    const verticalExponent=lerp(.77,.47,lowerBlend);
    const verticalHeight=lerp(topHeight,bottomHeight,lowerBlend);
    const yNorm=signedPow(sin,verticalExponent);
    const centerEnvelope=Math.pow(Math.max(0,1-Math.pow(Math.abs(xNorm),1.65)),2.2);
    const crownLift=sin<0?2.65*centerEnvelope*Math.pow(Math.max(0,-sin),.55):0;
    const settledFloor=sin>0?.62*centerEnvelope*Math.pow(sin,5):0;
    const x=120+width*xNorm;
    const y=136.4+verticalHeight*yNorm-crownLift+settledFloor;
    return{x,y,geometryModel:'ground-tangent-puddle'};
  }
  function mapCometDirectionalBody(th,radiusScale=1){
    const cos=Math.cos(th),sin=Math.sin(th);
    const stableScale=1+(radiusScale-1)*.48;
    const frontEase=smoothstep(-.14,.80,cos),rearEase=1-smoothstep(-.98,-.10,cos);
    const halfLength=80.5*stableScale;
    const x=127.5+halfLength*cos+13.5*frontEase-18.5*rearEase;
    const headToWake=smoothstep(-.94,.24,cos);
    const wakeTaper=.34+.66*headToWake;
    const headRound=1+.085*frontEase;
    const verticalRadius=58.5*stableScale*wakeTaper*headRound;
    const cranialDome=frontEase*(sin<0?2.15*Math.pow(-sin,2.2):.55*Math.pow(sin,2));
    const shoulderEase=1.15*Math.sin(Math.PI*headToWake)*Math.pow(Math.abs(sin),1.45);
    const y=108.2+sin*verticalRadius-cranialDome+shoulderEase*Math.sign(sin);
    return{x,y,geometryModel:'forward-mass-attached-wake'};
  }
  function mapDormantFamily(th,radiusScale=1,collapse=0){
    const cos=Math.cos(th),sin=Math.sin(th),c=Math.max(0,Math.min(1,collapse));
    const stableScale=1+(radiusScale-1)*lerp(.48,.36,c);
    const width=lerp(79.5,105.0,c)*stableScale;
    const upperHeight=lerp(74.0,47.5,c)*stableScale;
    const lowerHeight=lerp(72.0,42.5,c)*stableScale;
    const xExponent=lerp(.96,.74,c),yExponent=lerp(.98,.72,c);
    const xNorm=signedPow(cos,xExponent),yNorm=signedPow(sin,yExponent);
    const sideIdentity=(gaussAngle(th,0,.16)+gaussAngle(th,Math.PI,.16))*lerp(4.15,2.35,c);
    const equatorEnvelope=Math.exp(-.5*Math.pow(sin/.31,2));
    const crownAsym=c*1.95*gaussAngle(th,-Math.PI/2,.72)-c*.72*gaussAngle(th,Math.PI/2,.72)+(1-c)*.9*gaussAngle(th,Math.PI/2,.85);
    const x=120+width*xNorm+Math.sign(cos||1)*sideIdentity*(.55+.45*equatorEnvelope);
    const y=111.5+(sin<0?upperHeight:lowerHeight)*yNorm-crownAsym;
    return{x,y,geometryModel:'dormant-family'};
  }
  function mapFormPoint(th,radius,profile=FORM_PROFILES[silhouetteProfile],profileId=silhouetteProfile){
    const scale=radius/Math.max(.001,baseRadiusAtFor(profileId,th));
    if(profile.geometryModel==='ground-tangent-puddle')return mapLowOrbitPuddle(th,scale);
    if(profile.geometryModel==='forward-mass-attached-wake')return mapCometDirectionalBody(th,scale);
    if(profile.geometryModel==='dormant-family')return mapDormantFamily(th,scale,profile.dormantCollapse||0);
    return{x:120+profile.cx+Math.cos(th)*radius*profile.sx,y:110+profile.cy+Math.sin(th)*radius*profile.sy,geometryModel:profile.geometryModel||'radial-shared-topology'};
  }
  function liftSurfacePoint(point,profile){
    const frame=formProjectionFrame(profile),objectX=point.x-frame.cx,objectY=point.y-frame.cy,nx=objectX/frame.rx,ny=objectY/frame.ry,inside=Math.max(0,1-nx*nx-ny*ny),latentDepth=(profile.latentDepthScale||profileDepthScale(profile))*Math.pow(inside,.58);
    return{...point,sourceX:point.x,sourceY:point.y,objectX,objectY,latentDepth};
  }
  function rotateViewPoint(point,theta=viewYawDegrees*Math.PI/180){
    const cos=Math.cos(theta),sin=Math.sin(theta),rotatedX=point.objectX*cos+point.latentDepth*sin,projectedDepth=-point.objectX*sin+point.latentDepth*cos;
    return{...point,rotatedX,projectedDepth};
  }
  function projectViewPoint(point,profile,surfaceInfluence=1){
    const frame=formProjectionFrame(profile),cx=frame.cx,cy=frame.cy,weakScale=1+point.projectedDepth*.00072,projectedX=cx+point.rotatedX*weakScale,projectedY=cy+point.objectY*weakScale;
    return{...point,x:lerp(point.sourceX,projectedX,surfaceInfluence),y:lerp(point.sourceY,projectedY,surfaceInfluence)};
  }
  function viewDeformPoint(point,profile){
    return authorKeyViewPoint(point,profile,1);
  }
  function createBaseContour(){
    return Object.freeze(Array.from({length:CONTOUR_SAMPLES},(_,index)=>{
      const th=-Math.PI/2+index*(2*Math.PI/CONTOUR_SAMPLES),baseRadius=baseRadiusAtFor('presence',th);
      return Object.freeze({
        index,th,baseRadius,
        weights:Object.freeze({
          crown:gaussAngle(th,-Math.PI/2,0.78),lower:gaussAngle(th,Math.PI/2,0.85),
          sideRight:gaussAngle(th,0,0.42),sideLeft:gaussAngle(th,Math.PI,0.42),
          mouthCenter:gaussAngle(th,Math.PI/2,0.18),mouthRight:gaussAngle(th,1.23,0.13),mouthLeft:gaussAngle(th,1.91,0.13),
          cheekRight:gaussAngle(th,0.72,0.18),cheekLeft:gaussAngle(th,2.42,0.18)
        })
      });
    }));
  }
  let BASE_CONTOUR=createBaseContour();
  const ARTICULATION_MESH=Object.freeze({
    vertices:Object.freeze(ADAPTIVE_STRUCTURAL_TOPOLOGY.vertices.map(vertex=>Object.freeze({...vertex,radius:vertex.radial}))),
    triangles:ADAPTIVE_STRUCTURAL_TOPOLOGY.triangles,
  });

function createFaceSurfaceAnchorFor(profileId,x,y){
  const profile=FORM_PROFILES[profileId];
  const candidates=ARTICULATION_MESH.vertices.map(vertex=>{
    const radius=baseRadiusAtFor(profileId,vertex.theta),boundary=mapFormPoint(vertex.theta,radius,profile,profileId),cx=profile.geometryModel==='ground-tangent-puddle'?120:profile.geometryModel==='forward-mass-attached-wake'?132:120+profile.cx,cy=profile.geometryModel==='ground-tangent-puddle'?136:profile.geometryModel==='forward-mass-attached-wake'?108:110+profile.cy,px=cx+(boundary.x-cx)*vertex.radius,py=cy+(boundary.y-cy)*vertex.radius;
    return{index:vertex.index,distance:Math.hypot(px-x,py-y)};
  }).sort((a,b)=>a.distance-b.distance).slice(0,6);
  const raw=candidates.map(candidate=>1/Math.max(.01,candidate.distance*candidate.distance)),total=raw.reduce((sum,value)=>sum+value,0);
  return Object.freeze({x,y,nodes:Object.freeze(candidates.map((candidate,index)=>Object.freeze({index:candidate.index,weight:raw[index]/total})))});
}
function createFaceSurfaceAnchor(x,y){return createFaceSurfaceAnchorFor(silhouetteProfile,x,y);}
function createFaceSurfaceAnchorsFor(profileId){
  if(profileId==='low-orbit')return Object.freeze({eyeL:createFaceSurfaceAnchorFor(profileId,91,105),eyeR:createFaceSurfaceAnchorFor(profileId,149,105),mouth:createFaceSurfaceAnchorFor(profileId,121,137)});
  if(profileId==='comet')return Object.freeze({eyeL:createFaceSurfaceAnchorFor(profileId,104,99),eyeR:createFaceSurfaceAnchorFor(profileId,163,100),mouth:createFaceSurfaceAnchorFor(profileId,134,137)});
  return Object.freeze({eyeL:createFaceSurfaceAnchorFor(profileId,84,99),eyeR:createFaceSurfaceAnchorFor(profileId,156,99),mouth:createFaceSurfaceAnchorFor(profileId,121,140)});
}
function createFaceSurfaceAnchors(){return createFaceSurfaceAnchorsFor(silhouetteProfile);}
let FACE_SURFACE_ANCHORS = createFaceSurfaceAnchors();
function resolveFaceAnchorOffset(anchor){
  return anchor.nodes.reduce((offset,node)=>({x:offset.x+meshOffsets[node.index].x*node.weight,y:offset.y+meshOffsets[node.index].y*node.weight}),{x:0,y:0});
}
function blendPoint(a,b,mix){return{...a,x:lerp(a.x,b.x,mix),y:lerp(a.y,b.y,mix),sourceX:a.sourceX!==undefined&&b.sourceX!==undefined?lerp(a.sourceX,b.sourceX,mix):undefined,sourceY:a.sourceY!==undefined&&b.sourceY!==undefined?lerp(a.sourceY,b.sourceY,mix):undefined};}
function blendPointSets(a,b,mix){return a.map((point,index)=>blendPoint(point,b[index],mix));}
function blendAnchor(a,b,mix){
  const weights=new Map();
  for(const node of a.nodes)weights.set(node.index,(weights.get(node.index)||0)+node.weight*(1-mix));
  for(const node of b.nodes)weights.set(node.index,(weights.get(node.index)||0)+node.weight*mix);
  const nodes=[...weights.entries()].filter(([,weight])=>weight>.00001).map(([index,weight])=>({index,weight}));
  const total=nodes.reduce((sum,node)=>sum+node.weight,0)||1;
  return{x:lerp(a.x,b.x,mix),y:lerp(a.y,b.y,mix),nodes:nodes.map(node=>({index:node.index,weight:node.weight/total}))};
}
function blendFaceAnchors(a,b,mix){return{eyeL:blendAnchor(a.eyeL,b.eyeL,mix),eyeR:blendAnchor(a.eyeR,b.eyeR,mix),mouth:blendAnchor(a.mouth,b.mouth,mix)};}
function profileDepthScale(profile){return profile.geometryModel==='ground-tangent-puddle'?24:profile.geometryModel==='forward-mass-attached-wake'?44:profile.geometryModel==='dormant-family'?38:64;}
function blendProfiles(a,b,mix){
  const frameA=formProjectionFrame(a),frameB=formProjectionFrame(b);
  return{
    ...a,
    label:mix<.5?a.label:b.label,
    note:mix<.5?a.note:b.note,
    face:lerp(a.face?1:0,b.face?1:0,mix)>.001,
    faceX:lerp(a.faceX||0,b.faceX||0,mix),faceY:lerp(a.faceY||0,b.faceY||0,mix),
    faceScaleX:lerp(a.faceScaleX||1,b.faceScaleX||1,mix),faceScaleY:lerp(a.faceScaleY||1,b.faceScaleY||1,mix),
    eyeWidthScale:lerp(a.eyeWidthScale||1,b.eyeWidthScale||1,mix),eyeOpenScale:lerp(a.eyeOpenScale||1,b.eyeOpenScale||1,mix),mouthYShift:lerp(a.mouthYShift||0,b.mouthYShift||0,mix),mouthScale:lerp(a.mouthScale||1,b.mouthScale||1,mix),mouthOpenScale:lerp(a.mouthOpenScale||1,b.mouthOpenScale||1,mix),
    cx:lerp(a.cx||0,b.cx||0,mix),cy:lerp(a.cy||0,b.cy||0,mix),sx:lerp(a.sx||1,b.sx||1,mix),sy:lerp(a.sy||1,b.sy||1,mix),
    horizon:lerp(a.horizon||0,b.horizon||0,mix),disc:lerp(a.disc||0,b.disc||0,mix),lensed:lerp(a.lensed||0,b.lensed||0,mix),dormantCollapse:lerp(a.dormantCollapse||0,b.dormantCollapse||0,mix),dormantSpin:lerp(a.dormantSpin||0,b.dormantSpin||0,mix),
    geometryModel:'interpolated-embodiment',
    projectionFrame:{cx:lerp(frameA.cx,frameB.cx,mix),cy:lerp(frameA.cy,frameB.cy,mix),rx:lerp(frameA.rx,frameB.rx,mix),ry:lerp(frameA.ry,frameB.ry,mix)},
    latentDepthScale:lerp(profileDepthScale(a),profileDepthScale(b),mix)
  };
}
function profileWeight(fromId,toId,mix,targetId){return lerp(fromId===targetId?1:0,toId===targetId?1:0,mix);}
function profileFaceWeight(profileId){return FORM_PROFILES[profileId].face?1:0;}
function profileShellOpacity(profileId){return profileId==='singularity'?.94:profileId==='dormant-orbit'?.98:1;}

function sampleBodyForProfile(profileId,st,t){
  const pts=[],c=Number(coupling.value),drift=Number(motion.value)*(st.motionGain??.72),profile=FORM_PROFILES[profileId],frame=formProjectionFrame(profile),volumeX=st.postureScaleX||1,volumeY=st.postureScaleY||1;
  for(const vertex of BASE_CONTOUR){
    const {index,th,weights}=vertex;let r=formRadiusAtFor(profileId,th);
    const lower=weights.lower,sideR=weights.sideRight,sideL=weights.sideLeft,top=weights.crown;
    r+=st.wide*(1.8*lower+1.0*(sideR+sideL));r+=st.crown*1.6*top;r+=st.low*(1.05*lower-0.40*top);r+=st.asym*(1.6*sideR-1.4*sideL+0.55*gaussAngle(th,-0.12,0.42)-0.42*gaussAngle(th,Math.PI+0.12,0.42));
    r-=c*(1.55*st.mouthCurve+1.20*st.mouthOpen)*weights.mouthCenter;r-=c*(1.30*st.pullR+0.65*st.mouthCurve)*weights.mouthRight;r-=c*(1.30*st.pullL+0.65*st.mouthCurve)*weights.mouthLeft;r+=c*(0.60*st.mouthCurve+0.42*st.mouthOpen)*(weights.cheekRight+weights.cheekLeft);
    r+=0.35*drift*Math.sin(t*0.74*(st.tempo||1)+th*2.0+(st.microSeed||1))+0.20*drift*Math.sin(t*0.38*(st.tempo||1)+th*3.5+1.2)+0.13*drift*Math.sin(t*0.27*(st.tempo||1)+th*5.0+2.6);
    const mapped=mapFormPoint(th,r,profile,profileId),nx=mapped.x-frame.cx,ny=mapped.y-frame.cy,lean=(st.bodyLean||0)*(1-Math.min(1,Math.abs(ny)/(frame.ry||80)));
    const posed={x:frame.cx+nx*volumeX+(st.postureX||0)+lean,y:frame.cy+ny*volumeY+(st.postureY||0)};
    pts.push(viewDeformPoint({index,x:posed.x,y:posed.y,th,geometryModel:mapped.geometryModel},profile));
  }
  return pts;
}
function sampleBody(st,t){return sampleBodyForProfile(silhouetteProfile,st,t);}

function distributedMeshPoints(contour){return distributedMeshPointsFor(contour,silhouetteProfile);}
function expressionGaussian(point,anchor,rx,ry){const dx=(point.x-anchor.x)/Math.max(.001,rx),dy=(point.y-anchor.y)/Math.max(.001,ry);return Math.exp(-.5*(dx*dx+dy*dy));}
function applyExpressionField(point,st,anchors){
  const left=anchors.eyeL,right=anchors.eyeR,mouthAnchor=anchors.mouth;
  const wl=expressionGaussian(point,left,31,22),wr=expressionGaussian(point,right,31,22),wm=expressionGaussian(point,mouthAnchor,38,25),cl=expressionGaussian(point,{x:left.x-8,y:mouthAnchor.y-4},34,26),cr=expressionGaussian(point,{x:right.x+8,y:mouthAnchor.y-4},34,26);
  let dx=0,dy=0,depth=0;
  dy-=wl*(st.browL||0)*2.7;dy-=wr*(st.browR||0)*2.7;
  dy+=wl*(.55-(st.eyeOpenL||.2))*1.25+wr*(.55-(st.eyeOpenR||.2))*1.25;
  dx+=wl*(st.focusX||0)*-.55+wr*(st.focusX||0)*-.55;
  dy-=wm*((st.mouthOpen||0)*1.4+(st.mouthCurve||0)*.72);dx+=wm*(st.mouthSkew||0)*1.8;
  dx-=cl*(st.cheekL||0)*1.4;dx+=cr*(st.cheekR||0)*1.4;dy-=cl*(st.cheekL||0)*.45+cr*(st.cheekR||0)*.45;
  depth=(wl+wr)*(.22+(st.tension||0)*.28)+wm*(.18+(st.mouthPinch||0)*.34)+(cl*(st.cheekL||0)+cr*(st.cheekR||0))*.18;
  return{...point,x:point.x+dx,y:point.y+dy,expressionDepth:depth};
}
function distributedMeshPointsFor(contour,profileId,st=current,anchors=createFaceSurfaceAnchorsFor(profileId)){
  const profile=FORM_PROFILES[profileId],frame=formProjectionFrame(profile),cx=frame.cx,cy=frame.cy;
  return ARTICULATION_MESH.vertices.map(vertex=>{
    const contourIndex=Math.round((((vertex.theta+Math.PI/2)%(2*Math.PI)+2*Math.PI)%(2*Math.PI))/(2*Math.PI)*CONTOUR_SAMPLES)%CONTOUR_SAMPLES;
    const boundary=contour[contourIndex],offset=meshOffsets[vertex.index];
    const sourceX=cx+((boundary.sourceX??boundary.x)-cx)*vertex.radius+offset.x,sourceY=cy+((boundary.sourceY??boundary.y)-cy)*vertex.radius+offset.y;
    const expressive=applyExpressionField({...vertex,x:sourceX,y:sourceY},st,anchors),source={...expressive,sourceX:expressive.x,sourceY:expressive.y};
    if(viewYawDegrees===0)return{...source,latentDepth:source.expressionDepth||0,projectedDepth:0};
    return authorKeyViewPoint(source,profile,1);
  });
}
function applyMeshWarp(contour,mesh){
    const edited=mesh.filter(vertex=>Math.abs(meshOffsets[vertex.index].x)>.001||Math.abs(meshOffsets[vertex.index].y)>.001);
    if(!edited.length)return contour;
    return contour.map(point=>{let dx=0,dy=0,total=0;for(const vertex of edited){const offset=meshOffsets[vertex.index],distance=Math.hypot(point.x-vertex.x,point.y-vertex.y),weight=Math.exp(-(distance*distance)/(2*24*24));dx+=offset.x*weight;dy+=offset.y*weight;total+=weight;}const scale=Math.min(1,total);return{...point,x:point.x+dx/(total||1)*scale,y:point.y+dy/(total||1)*scale};});
  }
  function meshEdgePath(mesh){let path='';for(const triangle of ARTICULATION_MESH.triangles){const a=mesh[triangle[0]],b=mesh[triangle[1]],c=mesh[triangle[2]];path+=`M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)} L ${c.x.toFixed(2)} ${c.y.toFixed(2)} Z `;}return path;}

  function eventPoint(event){const p=avatar.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(avatar.getScreenCTM().inverse());}
  avatar.addEventListener('pointerdown',event=>{
    if(!debugOn||!lastMeshPoints.length)return;
    const p=eventPoint(event);let best=-1,bestDistance=Infinity;
    for(const vertex of lastMeshPoints){const distance=Math.hypot(vertex.x-p.x,vertex.y-p.y);if(distance<bestDistance){bestDistance=distance;best=vertex.index;}}
    if(bestDistance>8)return;selectedVertex=best;dragOrigin={pointer:p,offset:{...meshOffsets[best]}};avatar.setPointerCapture(event.pointerId);event.preventDefault();
  });
  avatar.addEventListener('pointermove',event=>{if(selectedVertex<0||!dragOrigin)return;const p=eventPoint(event);meshOffsets[selectedVertex].x=dragOrigin.offset.x+p.x-dragOrigin.pointer.x;meshOffsets[selectedVertex].y=dragOrigin.offset.y+p.y-dragOrigin.pointer.y;});
  function endDrag(event){if(selectedVertex<0)return;selectedVertex=-1;dragOrigin=null;if(avatar.hasPointerCapture(event.pointerId))avatar.releasePointerCapture(event.pointerId);}
  avatar.addEventListener('pointerup',endDrag);avatar.addEventListener('pointercancel',endDrag);
  function computeNormals(pts){const out=[];for(let i=0;i<pts.length;i++){const p=pts[i],p0=pts[(i-1+pts.length)%pts.length],p2=pts[(i+1)%pts.length];let nx=p2.y-p0.y,ny=-(p2.x-p0.x);const len=Math.hypot(nx,ny)||1;nx/=len;ny/=len;if(nx*(p.x-120)+ny*(p.y-110)<0){nx=-nx;ny=-ny;}out.push({x:nx,y:ny});}return out;}
  function angleToIndex(angle,n=CONTOUR_SAMPLES){const start=1.5*Math.PI,a=((angle%(2*Math.PI))+2*Math.PI)%(2*Math.PI),delta=(a-start+2*Math.PI)%(2*Math.PI);return Math.round(delta/(2*Math.PI)*n)%n;}
  function ribbonFromAnchors(pts,normals,anchors,lightDir,offsetBase,offsetGain,widthBase,widthGain){const outer=[],inner=[];for(let j=0;j<anchors.length;j++){const idx=angleToIndex(anchors[j],pts.length),p=pts[idx],n=normals[idx];let q=Math.max(0,n.x*lightDir[0]+n.y*lightDir[1]);q=smoothstep(0.18,0.96,q);const env=Math.pow(Math.sin(Math.PI*(j/Math.max(1,anchors.length-1))),0.9),off=offsetBase+offsetGain*(0.20+0.80*q),w=(widthBase+widthGain*q)*env;outer.push({x:p.x-n.x*(off-w*.5),y:p.y-n.y*(off-w*.5)});inner.push({x:p.x-n.x*(off+w*.5),y:p.y-n.y*(off+w*.5)});}return{outer,inner};}
  function ribbonPath(outer,inner){if(!outer.length||!inner.length)return'';const rev=[...inner].reverse();return`M ${outer[0].x.toFixed(2)} ${outer[0].y.toFixed(2)}`+splineSegments(outer)+` L ${rev[0].x.toFixed(2)} ${rev[0].y.toFixed(2)}`+splineSegments(rev)+' Z';}
  function centerlineFromAnchors(pts,normals,anchors,lightDir,insetBase,insetGain){const out=[];for(let j=0;j<anchors.length;j++){const idx=angleToIndex(anchors[j],pts.length),p=pts[idx],n=normals[idx];let q=Math.max(0,n.x*lightDir[0]+n.y*lightDir[1]);q=smoothstep(0.18,0.96,q);const env=Math.pow(Math.sin(Math.PI*(j/Math.max(1,anchors.length-1))),0.9),off=insetBase+insetGain*(0.25+0.75*q)*(0.55+0.45*env);out.push({x:p.x-n.x*off,y:p.y-n.y*off});}return out;}
  function eyePath(cx,cy,width,openv,tilt){const ap=1.8+openv*14.4,left=rotate(cx-width/2,cy,cx,cy,tilt),right=rotate(cx+width/2,cy,cx,cy,tilt),c1=rotate(cx-width*.24,cy-ap*1.08,cx,cy,tilt),c2=rotate(cx+width*.24,cy-ap*1.08,cx,cy,tilt),c3=rotate(cx+width*.26,cy-ap*.18,cx,cy,tilt),c4=rotate(cx-width*.26,cy-ap*.18,cx,cy,tilt);return`M ${left.x.toFixed(2)} ${left.y.toFixed(2)} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${right.x.toFixed(2)} ${right.y.toFixed(2)} C ${c3.x.toFixed(2)} ${c3.y.toFixed(2)} ${c4.x.toFixed(2)} ${c4.y.toFixed(2)} ${left.x.toFixed(2)} ${left.y.toFixed(2)} Z`;}
  function mouthPath(st){const a=st.pullR-st.pullL,skew=st.mouthSkew||0,pinch=st.mouthPinch||0,round=st.mouthRound||0,cx=121+a*2.6+skew*4.2,cy=140-st.mouthLift*8-st.mouthCurve*1.4,w=(14.5+st.mouthWidth*25)*(1-round*.16),ap=(1.1+st.mouthOpen*13)*(1+round*.30)*(1-pinch*.18),curve=st.mouthCurve,leftY=cy-curve*5.8-st.pullL*4.4+skew*1.2,rightY=cy-curve*5.8-st.pullR*4.4-skew*1.2,left={x:cx-w/2,y:leftY},right={x:cx+w/2,y:rightY},top={x:cx+a*1.5+skew*1.4,y:cy-ap-curve*.7+pinch*.9},bottom={x:cx+a*1.2+skew*.8,y:cy+ap+curve*2.1-pinch*.45};return`M ${left.x.toFixed(2)} ${left.y.toFixed(2)} C ${(cx-w*.26).toFixed(2)} ${(cy-ap*1.12-st.pullL*.8+pinch*.8).toFixed(2)} ${(cx-w*.10).toFixed(2)} ${top.y.toFixed(2)} ${top.x.toFixed(2)} ${top.y.toFixed(2)} C ${(cx+w*.10).toFixed(2)} ${top.y.toFixed(2)} ${(cx+w*.26).toFixed(2)} ${(cy-ap*1.12-st.pullR*.8+pinch*.8).toFixed(2)} ${right.x.toFixed(2)} ${right.y.toFixed(2)} C ${(cx+w*.22).toFixed(2)} ${(cy+ap*.88+st.pullR*.3).toFixed(2)} ${(cx+w*.09).toFixed(2)} ${bottom.y.toFixed(2)} ${bottom.x.toFixed(2)} ${bottom.y.toFixed(2)} C ${(cx-w*.09).toFixed(2)} ${bottom.y.toFixed(2)} ${(cx-w*.22).toFixed(2)} ${(cy+ap*.88+st.pullL*.3).toFixed(2)} ${left.x.toFixed(2)} ${left.y.toFixed(2)} Z`;}
  function setTriplet(core,bloom,shadow,d,dy=.9,offset={x:0,y:0},scaleX=1){const x=offset.x.toFixed(3),y=offset.y.toFixed(3),scale=scaleX===1?'':` translate(121 0) scale(${scaleX.toFixed(3)} 1) translate(-121 0)`;core.setAttribute('d',d);bloom.setAttribute('d',d);shadow.setAttribute('d',d);core.setAttribute('transform',`translate(${x} ${y})${scale}`);bloom.setAttribute('transform',`translate(${x} ${y})${scale}`);shadow.setAttribute('transform',`translate(${x} ${(offset.y+dy).toFixed(3)})${scale}`);}

  function renderFaceAnchorDebug(){
    const markers=[];
    for(const [feature,anchor] of Object.entries(FACE_SURFACE_ANCHORS)){
      const offset=resolveFaceAnchorOffset(anchor),circle=document.createElementNS(NS,'circle');
      circle.setAttribute('cx',(anchor.x+offset.x).toFixed(2));circle.setAttribute('cy',(anchor.y+offset.y).toFixed(2));circle.setAttribute('r','1.65');circle.setAttribute('data-face-anchor',feature);markers.push(circle);
    }
    faceAnchorDebug.replaceChildren(...markers);
  }

  function quadraticStroke(x1,y1,cx,cy,x2,y2){return`M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;}
  function renderExpressionShell(faceProjection,anchors,st,visibility){
    const leftOffset=resolveFaceAnchorOffset(anchors.eyeL),rightOffset=resolveFaceAnchorOffset(anchors.eyeR),mouthOffset=resolveFaceAnchorOffset(anchors.mouth),lx=faceProjection.leftEye.x+leftOffset.x,ly=faceProjection.leftEye.y+leftOffset.y,rx=faceProjection.rightEye.x+rightOffset.x,ry=faceProjection.rightEye.y+rightOffset.y,mx=faceProjection.mouth.x+mouthOffset.x-121,my=faceProjection.mouth.y+mouthOffset.y-140;
    const lw=faceProjection.leftEye.width*(st.eyeWidthL||1),rw=faceProjection.rightEye.width*(st.eyeWidthR||1),tension=Math.max(0,Math.min(1,st.tension||0)),browOpacity=Math.max(.06,tension*.62),cheekOpacity=Math.max(0,(Math.abs(st.cheekL||0)+Math.abs(st.cheekR||0))*.32),mouthOpacity=Math.max(.04,tension*.44+Math.abs(st.mouthCurve||0)*.22);
    browTensionL.setAttribute('d',quadraticStroke(lx-lw*.43,ly-7-(st.browL||0)*2.2,lx,ly-10-(st.browL||0)*3.1,lx+lw*.43,ly-7-(st.browL||0)*2.2));
    browTensionR.setAttribute('d',quadraticStroke(rx-rw*.43,ry-7-(st.browR||0)*2.2,rx,ry-10-(st.browR||0)*3.1,rx+rw*.43,ry-7-(st.browR||0)*2.2));
    cheekTensionL.setAttribute('d',quadraticStroke(lx-lw*.36,my+4,lx-lw*.58,my+8+(st.cheekL||0)*2,lx-lw*.72,my+13));
    cheekTensionR.setAttribute('d',quadraticStroke(rx+rw*.36,my+4,rx+rw*.58,my+8+(st.cheekR||0)*2,rx+rw*.72,my+13));
    mouthTension.setAttribute('d',quadraticStroke(faceProjection.mouth.x-21+mouthOffset.x,my-8,faceProjection.mouth.x+mouthOffset.x+((st.mouthSkew||0)*3),my-11-(st.mouthCurve||0)*2,faceProjection.mouth.x+21+mouthOffset.x,my-8));
    eyeTroughL.setAttribute('d',quadraticStroke(lx-lw*.42,ly+4,lx,ly+7+tension*2,lx+lw*.42,ly+4));eyeTroughR.setAttribute('d',quadraticStroke(rx-rw*.42,ry+4,rx,ry+7+tension*2,rx+rw*.42,ry+4));mouthTrough.setAttribute('d',quadraticStroke(faceProjection.mouth.x-18+mouthOffset.x,my+6,faceProjection.mouth.x+mouthOffset.x,my+9+tension*2,faceProjection.mouth.x+18+mouthOffset.x,my+6));
    expressionShellLayer.setAttribute('opacity',(visibility*Math.max(.08,browOpacity,cheekOpacity,mouthOpacity)).toFixed(3));expressionOcclusionLayer.setAttribute('opacity',(visibility*(.16+tension*.30)).toFixed(3));browTensionL.setAttribute('opacity',browOpacity.toFixed(3));browTensionR.setAttribute('opacity',browOpacity.toFixed(3));cheekTensionL.setAttribute('opacity',(Math.max(.02,Math.abs(st.cheekL||0)*.64)).toFixed(3));cheekTensionR.setAttribute('opacity',(Math.max(.02,Math.abs(st.cheekR||0)*.64)).toFixed(3));mouthTension.setAttribute('opacity',mouthOpacity.toFixed(3));
  }
  function ellipseSubpath(x,y,rx,ry){return`M ${(x-rx).toFixed(2)} ${y.toFixed(2)} a ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(rx*2).toFixed(2)} 0 a ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(-rx*2).toFixed(2)} 0 Z`;}
  function usesHighDetail(){return detailTier==='high'||(detailTier==='adaptive'&&previewSize>=320&&reliefPreset!=='none');}
  function renderAdaptiveRelief(contour,profile){
    const started=performance.now(),highDetail=usesHighDetail();
    if(!highDetail||reliefPreset==='none'){
      activeReliefSamples=0;reliefLayer.setAttribute('opacity','0');reliefHighlight.setAttribute('d','');reliefShadow.setAttribute('d','');
      frameMetrics.reliefMs.push(performance.now()-started);return;
    }
    const evaluateStarted=performance.now(),heights=SidekickReliefFields.evaluateRelief(DETAIL_TOPOLOGY,RELIEF_PRESETS[reliefPreset],17);
    frameMetrics.reliefEvaluationMs.push(performance.now()-evaluateStarted);
    const normalStarted=performance.now(),normals=SidekickReliefFields.deriveNormals(DETAIL_TOPOLOGY,heights);
    frameMetrics.reliefNormalMs.push(performance.now()-normalStarted);
    const cx=120+profile.cx,cy=110+profile.cy,highlight=[],shadow=[];
    for(const vertex of DETAIL_TOPOLOGY.vertices){
      const height=heights[vertex.index],magnitude=Math.abs(height);
      const threshold=reliefPreset==='goosebumps'?.10:.28;
      if(magnitude<threshold||vertex.radial<.19||vertex.radial>.94)continue;
      const contourIndex=Math.round((((vertex.theta+Math.PI/2)%(2*Math.PI)+2*Math.PI)%(2*Math.PI))/(2*Math.PI)*contour.length)%contour.length;
      const boundary=contour[contourIndex],radial=vertex.radial;
      const x=cx+(boundary.x-cx)*radial,y=cy+(boundary.y-cy)*radial,normal=normals[vertex.index];
      const size=(reliefPreset==='goosebumps'?.22:3.20)+Math.min(reliefPreset==='goosebumps'?1.35:3.80,magnitude*(reliefPreset==='goosebumps'?.68:2.50)),rx=size*(reliefPreset==='brow_raise'?1.45:1),ry=size*(reliefPreset==='cheek_dimple'?.72:1);
      const lightX=x-.38-normal.x*.52,lightY=y-.46-normal.y*.52,darkX=x+.42+normal.x*.46,darkY=y+.54+normal.y*.46;
      highlight.push(ellipseSubpath(lightX,lightY,rx,ry));shadow.push(ellipseSubpath(darkX,darkY,rx*1.08,ry*1.08));
    }
    activeReliefSamples=RELIEF_SAMPLES;reliefHighlight.setAttribute('d',highlight.join(' '));reliefShadow.setAttribute('d',shadow.join(' '));
    const goose=reliefPreset==='goosebumps';reliefHighlight.setAttribute('filter',goose?'url(#reliefMicro)':'url(#adaptiveReliefSoft)');reliefShadow.setAttribute('filter',goose?'url(#reliefMicro)':'url(#adaptiveReliefSoft)');reliefHighlight.setAttribute('opacity',goose?'.28':'.45');reliefShadow.setAttribute('opacity',goose?'.34':'.48');reliefLayer.setAttribute('opacity',goose?'0.52':'0.70');
    frameMetrics.reliefMs.push(performance.now()-started);
  }

  const layerVisibility = new Map(MATERIAL_MESH_BINDINGS.map(([key])=>[key,true]));
  const baselineLayerSet = new Set(['shell-base','key-reflection','secondary-reflection','edge-rims','face-recess','face-emission','ground-contact']);
  function applyLayerVisibility(){
    document.querySelectorAll('[data-material-layer]').forEach(node=>{node.style.display=layerVisibility.get(node.dataset.materialLayer)?'':'none';});
  }
  function renderMaterialLayerControls(){
    const host=$('materialLayerControls'),rows=MATERIAL_MESH_BINDINGS.map(([key,label])=>{
      const row=document.createElement('div');row.className='layer-row';
      const control=document.createElement('label'),checkbox=document.createElement('input'),name=document.createElement('span'),solo=document.createElement('button');
      checkbox.type='checkbox';checkbox.checked=layerVisibility.get(key);checkbox.onchange=()=>{layerVisibility.set(key,checkbox.checked);materialProfile='custom';applyLayerVisibility();renderMaterialProfileButtons();};
      name.textContent=label;control.append(checkbox,name);solo.type='button';solo.textContent='Solo';solo.onclick=()=>{MATERIAL_MESH_BINDINGS.forEach(([candidate])=>layerVisibility.set(candidate,candidate===key));materialProfile='custom';renderMaterialLayerControls();applyLayerVisibility();renderMaterialProfileButtons();};
      row.append(control,solo);return row;
    });
    host.replaceChildren(...rows);
  }
  function setLayerPreset(profile){
    materialProfile=profile;MATERIAL_MESH_BINDINGS.forEach(([key])=>layerVisibility.set(key,profile==='master'||baselineLayerSet.has(key)));renderMaterialLayerControls();applyLayerVisibility();renderMaterialProfileButtons();
  }
  function renderMaterialProfileButtons(){document.querySelectorAll('[data-material-profile]').forEach(button=>{button.classList.toggle('active',button.dataset.materialProfile===materialProfile);button.onclick=()=>setLayerPreset(button.dataset.materialProfile);});}
  function setContainmentMode(value){
    if(!['all','contained','aura'].includes(value))throw new TypeError('unknown containment mode');
    containmentMode=value;containedLobeMaterial.style.display=value==='aura'?'none':'';exteriorAuraLayer.style.display=value==='contained'?'none':'';avatar.dataset.containmentMode=value;
    document.querySelectorAll('[data-containment-mode]').forEach(button=>button.classList.toggle('active',button.dataset.containmentMode===value));
  }
  function renderContainmentControls(){document.querySelectorAll('[data-containment-mode]').forEach(button=>{button.onclick=()=>setContainmentMode(button.dataset.containmentMode);});setContainmentMode(containmentMode);}
  function viewFaceTransform(profile){
    const metrics=getViewMetrics(profile),cx=120+(profile.faceX||0)+metrics.faceShift;
    return `translate(${cx.toFixed(2)} 112) translate(0 ${profile.faceY}) scale(${(profile.faceScaleX*metrics.faceCompression).toFixed(4)} ${profile.faceScaleY}) translate(-120 -112)`;
  }
  function applyViewLobeParallax(profile=FORM_PROFILES[silhouetteProfile]){
    const metrics=getViewMetrics(profile),leftScale=metrics.farLobeScale.toFixed(4),rightScale=metrics.nearLobeScale.toFixed(4);
    for(const node of [leftLobeShade,leftLobeVolume,leftLobeGlint,leftLobeAura]){node.setAttribute('transform',`translate(34 111) scale(${leftScale} 1) translate(-34 -111)`);node.dataset.viewDepth='far';}
    for(const node of [rightLobeShade,rightLobeVolume,rightLobeGlint,rightLobeAura]){node.setAttribute('transform',`translate(206 111) scale(${rightScale} 1) translate(-206 -111)`);node.dataset.viewDepth='near';}
    viewTailBackLayer.dataset.viewDepthRole=metrics.viewDepthRole;viewTailFrontLayer.dataset.viewDepthRole=metrics.viewDepthRole;
  }
  function applyFormPresence(){
    const profileId=silhouetteProfile,profile=FORM_PROFILES[profileId];
    faceRecessLayer.style.display='';faceEmissionLayer.style.display='';
    const faceTransform=viewFaceTransform(profile);
    faceRecessLayer.setAttribute('transform',faceTransform);faceEmissionLayer.setAttribute('transform',faceTransform);
    chromaticShell.setAttribute('opacity',profileShellOpacity(profileId).toFixed(3));
    avatar.dataset.formProfile=profileId;avatar.dataset.viewAuthority=viewYawDegrees===0?'front':'bounded-0-45-spike';avatar.dataset.yaw=String(viewYawDegrees);avatar.setAttribute('aria-label',`Gasper ${profile.label} form`);
  }
  function setSilhouetteProfile(profile){if(!FORM_PROFILES[profile])return;silhouetteProfile=profile;BASE_CONTOUR=createBaseContour();FACE_SURFACE_ANCHORS=createFaceSurfaceAnchors();applyFormPresence();applyLayerVisibility();renderSilhouetteProfileButtons();}
  function setDemoSilhouetteProfile(profile){setSilhouetteProfile(profile);demoIndex=Math.max(0,DEMO_SEQUENCE.indexOf(profile));}
  function setYaw(value){viewYawDegrees=clampYaw(value);yaw.value=String(viewYawDegrees);$('yawValue').textContent=`${viewYawDegrees.toFixed(0)}°`;applyFormPresence();}
  function renderSilhouetteProfileButtons(){document.querySelectorAll('[data-form-profile]').forEach(button=>{button.classList.toggle('active',button.dataset.formProfile===silhouetteProfile);button.onclick=()=>setDemoSilhouetteProfile(button.dataset.formProfile);});}
  function setPreviewSize(size){previewSize=size;avatar.style.setProperty('--avatar-size',`${size}px`);document.querySelectorAll('[data-preview-size]').forEach(button=>button.classList.toggle('active',Number(button.dataset.previewSize)===size));}
  function renderPreviewButtons(){document.querySelectorAll('[data-preview-size]').forEach(button=>{button.onclick=()=>setPreviewSize(Number(button.dataset.previewSize));});setPreviewSize(previewSize);}
  function setDetailTier(value){if(!['low','high','adaptive'].includes(value))throw new TypeError('unknown detail tier');detailTier=value;document.querySelectorAll('[data-detail-tier]').forEach(button=>button.classList.toggle('active',button.dataset.detailTier===detailTier));}
  function setReliefPreset(value){if(!Object.hasOwn(RELIEF_PRESETS,value))throw new TypeError('unknown relief preset');reliefPreset=value;document.querySelectorAll('[data-relief]').forEach(button=>button.classList.toggle('active',button.dataset.relief===reliefPreset));}
  function renderAdaptiveControls(){document.querySelectorAll('[data-detail-tier]').forEach(button=>{button.onclick=()=>setDetailTier(button.dataset.detailTier);});document.querySelectorAll('[data-relief]').forEach(button=>{button.onclick=()=>setReliefPreset(button.dataset.relief);});setDetailTier(detailTier);setReliefPreset(reliefPreset);}
  function syncLabels(){$('couplingValue').textContent=Number(coupling.value).toFixed(2);$('motionValue').textContent=Number(motion.value).toFixed(2);$('interiorValue').textContent=Number(interiorEnergy.value).toFixed(2);}

  function insetContour(pts,normals,inset){return pts.map((point,index)=>({...point,x:point.x-normals[index].x*inset,y:point.y-normals[index].y*inset}));}
  function meshCurve(mesh,coordinates){return coordinates.map(([ring,sector])=>mesh[ring*MESH_SECTORS+((sector%MESH_SECTORS)+MESH_SECTORS)%MESH_SECTORS]);}
  function setRecess(node,anchor,rx,ry){const offset=resolveFaceAnchorOffset(anchor);node.setAttribute('cx',(anchor.x+offset.x).toFixed(2));node.setAttribute('cy',(anchor.y+offset.y+1.2).toFixed(2));node.setAttribute('rx',rx);node.setAttribute('ry',ry);}
  function renderCosmicFlecks(mesh){
    const flecks=[];
    for(const point of mesh){
      const faceDistance=Math.pow((point.x-120)/58,2)+Math.pow((point.y-112)/40,2);
      if(point.index%29===0&&point.radius>.34&&point.radius<.82&&faceDistance>.54){
        const cloud=document.createElementNS(NS,'ellipse'),cyan=point.theta>0&&point.theta<Math.PI;
        cloud.setAttribute('cx',point.x.toFixed(2));cloud.setAttribute('cy',point.y.toFixed(2));cloud.setAttribute('rx',(6.5+(point.ring%3)*2.1).toFixed(2));cloud.setAttribute('ry',(3.8+(point.sector%3)*1.3).toFixed(2));cloud.setAttribute('fill',cyan?'url(#cloudCyanGrad)':'url(#cloudVioletGrad)');cloud.setAttribute('opacity',cyan?'.28':'.24');cloud.setAttribute('filter','url(#blurSoft)');cloud.setAttribute('transform',`rotate(${((point.sector*23)%70-35).toFixed(1)} ${point.x.toFixed(2)} ${point.y.toFixed(2)})`);flecks.push(cloud);
      }
      if(point.index%9!==0||point.radius<.38||point.radius>.86||faceDistance<.66)continue;
      const dot=document.createElementNS(NS,'circle');dot.setAttribute('cx',point.x.toFixed(2));dot.setAttribute('cy',point.y.toFixed(2));dot.setAttribute('r',point.index%27===0?'1.28':'.72');dot.setAttribute('fill',point.theta>0&&point.theta<Math.PI?'#78fff0':'#efc8ff');dot.setAttribute('opacity',point.index%27===0?'.76':'.48');flecks.push(dot);
    }
    cosmicFlecks.replaceChildren(...flecks);
  }
  function ellipseHalfPath(cx,cy,rx,ry,front){
    const k=.5522848;
    if(front)return `M ${(cx+rx).toFixed(2)} ${cy.toFixed(2)} C ${(cx+rx).toFixed(2)} ${(cy+k*ry).toFixed(2)} ${(cx+k*rx).toFixed(2)} ${(cy+ry).toFixed(2)} ${cx.toFixed(2)} ${(cy+ry).toFixed(2)} C ${(cx-k*rx).toFixed(2)} ${(cy+ry).toFixed(2)} ${(cx-rx).toFixed(2)} ${(cy+k*ry).toFixed(2)} ${(cx-rx).toFixed(2)} ${cy.toFixed(2)}`;
    return `M ${(cx-rx).toFixed(2)} ${cy.toFixed(2)} C ${(cx-rx).toFixed(2)} ${(cy-k*ry).toFixed(2)} ${(cx-k*rx).toFixed(2)} ${(cy-ry).toFixed(2)} ${cx.toFixed(2)} ${(cy-ry).toFixed(2)} C ${(cx+k*rx).toFixed(2)} ${(cy-ry).toFixed(2)} ${(cx+rx).toFixed(2)} ${(cy-k*ry).toFixed(2)} ${(cx+rx).toFixed(2)} ${cy.toFixed(2)}`;
  }
  function renderViewTail(pts,profile){
    viewTailBack.setAttribute('d','');viewTailFront.setAttribute('d','');viewTailBack.setAttribute('opacity','0');viewTailFront.setAttribute('opacity','0');
  }
  function renderCometHeadWakeFlow(pts,visibility,idle,motionStrength){
    if(visibility<=.001){cometFlowLayer.setAttribute('opacity','0');for(const node of [cometFlowGlow,cometFlowUpper,cometFlowLower])node.setAttribute('d','');return;}
    const minX=Math.min(...pts.map(point=>point.x)),maxX=Math.max(...pts.map(point=>point.x)),minY=Math.min(...pts.map(point=>point.y)),maxY=Math.max(...pts.map(point=>point.y)),width=maxX-minX,height=maxY-minY,cx=maxX-width*.31,cy=(minY+maxY)/2;
    const sway=Math.sin(idle.phase*Math.PI*2)*1.35*motionStrength;
    const upper=`M ${(maxX-width*.10).toFixed(2)} ${(cy-height*.25).toFixed(2)} C ${(cx-width*.04).toFixed(2)} ${(cy-height*.35+sway).toFixed(2)} ${(minX+width*.42).toFixed(2)} ${(cy-height*.20+sway*.45).toFixed(2)} ${(minX+width*.12).toFixed(2)} ${(cy-height*.035).toFixed(2)}`;
    const lower=`M ${(maxX-width*.12).toFixed(2)} ${(cy+height*.25).toFixed(2)} C ${(cx-width*.02).toFixed(2)} ${(cy+height*.31-sway).toFixed(2)} ${(minX+width*.41).toFixed(2)} ${(cy+height*.17-sway*.38).toFixed(2)} ${(minX+width*.13).toFixed(2)} ${(cy+height*.035).toFixed(2)}`;
    cometFlowGlow.setAttribute('d',`${upper} ${lower}`);cometFlowUpper.setAttribute('d',upper);cometFlowLower.setAttribute('d',lower);cometFlowLayer.setAttribute('opacity',(visibility*.82).toFixed(3));
  }
  function clearDormantOptics(){
    for(const node of [accretionRearLens,accretionRearLensGlow,accretionRearLensOuter,accretionRearLensInner,accretionNearPlane,accretionNearPlaneGlow,accretionNearPlaneBand,accretionNearPlaneHot,accretionLowerLens,accretionDiscBackGlow,accretionDiscBack,accretionDiscFront,accretionDiscHotCore]){node.setAttribute('d','');node.setAttribute('opacity','0');}
    eventHorizonCore.setAttribute('opacity','0');eventHorizonCore.setAttribute('rx','0');eventHorizonCore.setAttribute('ry','0');photonRingInner.setAttribute('opacity','0');photonRingInner.setAttribute('rx','0');photonRingInner.setAttribute('ry','0');
  }
  function renderDormantFamilyOptics(pts,profile,idle,motionStrength,identityWeights){
    clearDormantOptics();
    const singularityWeight=Math.max(0,Math.min(1,identityWeights.singularity||0)),orbitWeight=Math.max(0,Math.min(1,identityWeights.orbit||0)),familyWeight=Math.max(0,Math.min(1,singularityWeight+orbitWeight));
    if(familyWeight<=.001)return;
    const collapse=singularityWeight/Math.max(.001,familyWeight),minX=Math.min(...pts.map(point=>point.x)),maxX=Math.max(...pts.map(point=>point.x)),minY=Math.min(...pts.map(point=>point.y)),maxY=Math.max(...pts.map(point=>point.y));
    const width=maxX-minX,height=maxY-minY,cx=(minX+maxX)/2,cy=(minY+maxY)/2+lerp(height*.035,height*.008,collapse),metrics=getViewMetrics(profile);
    const slowPhase=idle.phase*Math.PI*2,breath=1+Math.sin(slowPhase)*lerp(.018,.008,collapse)*motionStrength;
    const ringRx=width*lerp(.76,.54,collapse)*breath,ringRy=Math.max(5.8,height*lerp(.105,.165,collapse))*breath*metrics.discPerspective;
    const tilt=lerp(-7.0,-2.4,collapse)+Math.sin(slowPhase*.5)*lerp(2.4,.45,collapse)*motionStrength;
    const transform=`rotate(${tilt.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})`;
    const backD=ellipseHalfPath(cx,cy,ringRx,ringRy,false),frontD=ellipseHalfPath(cx,cy,ringRx,ringRy,true);
    accretionDiscBackGlow.setAttribute('d',backD);accretionDiscBack.setAttribute('d',backD);accretionDiscFront.setAttribute('d',frontD);accretionDiscHotCore.setAttribute('d',frontD);
    for(const node of [accretionDiscBackGlow,accretionDiscBack,accretionDiscFront,accretionDiscHotCore])node.setAttribute('transform',transform);
    accretionDiscBackGlow.setAttribute('opacity','0');
    accretionDiscBack.setAttribute('opacity',(familyWeight*lerp(.78,.66,collapse)).toFixed(3));
    accretionDiscFront.setAttribute('opacity',(familyWeight*lerp(.94,.84,collapse)).toFixed(3));
    accretionDiscHotCore.setAttribute('opacity',(familyWeight*lerp(.96,.82,collapse)).toFixed(3));
    accretionDiscHotCore.setAttribute('stroke-width',lerp(1.7,1.35,collapse).toFixed(2));
    accretionDiscHotCore.setAttribute('stroke-dasharray',`${(ringRx*lerp(.18,.28,collapse)).toFixed(2)} ${(ringRx*.08).toFixed(2)} ${(ringRx*.045).toFixed(2)} ${(ringRx*.13).toFixed(2)}`);
    accretionDiscHotCore.setAttribute('stroke-dashoffset',(-idle.phase*ringRx*lerp(3.15,.72,collapse)).toFixed(2));

    const horizonRx=width*lerp(.10,.285,collapse)*breath,horizonRy=height*lerp(.075,.31,collapse)*breath;
    eventHorizonCore.setAttribute('cx',cx.toFixed(2));eventHorizonCore.setAttribute('cy',cy.toFixed(2));eventHorizonCore.setAttribute('rx',horizonRx.toFixed(2));eventHorizonCore.setAttribute('ry',horizonRy.toFixed(2));eventHorizonCore.setAttribute('transform',transform);eventHorizonCore.setAttribute('fill',collapse>.5?'#010008':'#08031a');eventHorizonCore.setAttribute('opacity',(familyWeight*lerp(.06,.985,collapse)).toFixed(3));
    photonRingInner.setAttribute('cx',cx.toFixed(2));photonRingInner.setAttribute('cy',cy.toFixed(2));photonRingInner.setAttribute('rx',(horizonRx*lerp(1.44,1.055,collapse)).toFixed(2));photonRingInner.setAttribute('ry',(horizonRy*lerp(1.36,1.055,collapse)).toFixed(2));photonRingInner.setAttribute('transform',transform);photonRingInner.setAttribute('opacity',(familyWeight*lerp(.14,.74,collapse)).toFixed(3));

    const innerRx=ringRx*lerp(.78,.86,collapse),innerRy=ringRy*lerp(.70,.48,collapse),innerBack=ellipseHalfPath(cx,cy-height*.006,innerRx,innerRy,false),innerFront=ellipseHalfPath(cx,cy+height*.004,innerRx,innerRy,true);
    accretionRearLensGlow.setAttribute('d',innerBack);accretionRearLens.setAttribute('d',innerBack);accretionRearLensOuter.setAttribute('d',ellipseHalfPath(cx,cy-height*.012,innerRx*.94,innerRy*1.55,false));accretionRearLensInner.setAttribute('d',ellipseHalfPath(cx,cy,innerRx*.78,innerRy*.48,false));
    accretionNearPlaneGlow.setAttribute('d',innerFront);accretionNearPlane.setAttribute('d',innerFront);accretionNearPlaneBand.setAttribute('d',innerFront);accretionNearPlaneHot.setAttribute('d',innerFront);
    const polarTilt=lerp(58,24,collapse)+Math.sin(slowPhase*.34)*4*motionStrength,polarTransform=`rotate(${polarTilt.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})`;
    accretionLowerLens.setAttribute('d',ellipseHalfPath(cx,cy,ringRx*lerp(.58,.42,collapse),ringRy*lerp(1.55,.84,collapse),true));
    for(const node of [accretionRearLensGlow,accretionRearLens,accretionRearLensOuter,accretionRearLensInner,accretionNearPlaneGlow,accretionNearPlane,accretionNearPlaneBand,accretionNearPlaneHot])node.setAttribute('transform',transform);
    accretionLowerLens.setAttribute('transform',polarTransform);
    accretionRearLensGlow.setAttribute('opacity',(familyWeight*lerp(.13,.20,collapse)).toFixed(3));accretionRearLens.setAttribute('opacity',(familyWeight*lerp(.46,.72,collapse)).toFixed(3));accretionRearLensOuter.setAttribute('opacity',(familyWeight*lerp(.38,.48,collapse)).toFixed(3));accretionRearLensInner.setAttribute('opacity',(familyWeight*lerp(.52,.64,collapse)).toFixed(3));
    accretionNearPlaneGlow.setAttribute('opacity',(familyWeight*lerp(.16,.22,collapse)).toFixed(3));accretionNearPlane.setAttribute('opacity',(familyWeight*lerp(.54,.88,collapse)).toFixed(3));accretionNearPlaneBand.setAttribute('opacity',(familyWeight*lerp(.42,.58,collapse)).toFixed(3));accretionNearPlaneHot.setAttribute('opacity',(familyWeight*lerp(.64,.82,collapse)).toFixed(3));
    accretionLowerLens.setAttribute('opacity',(familyWeight*orbitWeight*lerp(.46,.08,collapse)).toFixed(3));
  }
  function renderAccretionDisc(pts,profile,idle,motionStrength,identityWeights){renderDormantFamilyOptics(pts,profile,idle,motionStrength,identityWeights);}
  function renderMaterialRig(pts,normals,mesh,faceAnchors=FACE_SURFACE_ANCHORS){
    shellChromaticPath.setAttribute('d',closedSpline(insetContour(pts,normals,2.8)));
    innerVolumePath.setAttribute('d',closedSpline(insetContour(pts,normals,5.8)));
    pearlCorePath.setAttribute('d',closedSpline(insetContour(pts,normals,12.5)));
    violetCorePath.setAttribute('d',closedSpline(insetContour(pts,normals,14.5)));
    cosmicCloudPath.setAttribute('d',closedSpline(insetContour(pts,normals,9.5)));
    specularSurfacePath.setAttribute('d',closedSpline(insetContour(pts,normals,2.4)));
    cosmicCellA.setAttribute('d',closedSpline(meshCurve(mesh,[[10,19],[11,20],[10,21],[8,22],[7,21],[8,20]])));cosmicCellB.setAttribute('d',closedSpline(meshCurve(mesh,[[8,1],[10,2],[10,3],[9,4],[7,4],[7,2]])));cosmicCellC.setAttribute('d',closedSpline(meshCurve(mesh,[[11,12],[13,13],[13,14],[13,15],[12,16],[10,15]])));cosmicCellD.setAttribute('d',closedSpline(meshCurve(mesh,[[11,5],[13,6],[13,7],[13,8],[12,9],[10,8]])));
    violetCaustic.setAttribute('d',openSpline(meshCurve(mesh,[[7,4],[7,5],[8,6],[8,7],[9,8],[9,9],[9,10],[8,11],[8,12],[7,13]])));violetCaustic2.setAttribute('d',openSpline(meshCurve(mesh,[[5,2],[6,3],[6,4],[7,5],[7,6],[6,7],[6,8],[5,9]])));cyanCaustic.setAttribute('d',openSpline(meshCurve(mesh,[[11,7],[11,8],[12,9],[12,10],[12,11],[12,12],[11,13],[11,14],[10,15]])));blueCaustic2.setAttribute('d',openSpline(meshCurve(mesh,[[8,11],[9,12],[10,13],[10,14],[9,15],[8,16],[7,17]])));pearlCaustic.setAttribute('d',openSpline(meshCurve(mesh,[[6,18],[6,19],[7,20],[7,21],[7,22],[6,23],[6,0],[6,1],[7,2]])));
    keyFacetA.setAttribute('d',closedSpline(meshCurve(mesh,[[13,19],[13,20],[12,21],[11,22],[10,21],[11,20]])));keyFacetB.setAttribute('d',closedSpline(meshCurve(mesh,[[13,23],[13,0],[12,1],[10,2],[9,1],[10,0],[11,23]])));keyFacetC.setAttribute('d',closedSpline(meshCurve(mesh,[[12,20],[13,21],[12,22],[10,22],[9,21],[10,20]])));keyFacetD.setAttribute('d',closedSpline(meshCurve(mesh,[[11,23],[12,0],[11,1],[9,1],[8,0],[9,23]])));
    const crown=ribbonFromAnchors(pts,normals,CROWN_ANCHORS,[-.42,-.91],3,18,22,34),crownHot=ribbonFromAnchors(pts,normals,CROWN_HOT_ANCHORS,[-.18,-.98],8,13,5,12),cyan=ribbonFromAnchors(pts,normals,CYAN_ANCHORS,[0,-1],2,16,12,24);
    crownBloomPath.setAttribute('d',ribbonPath(crown.outer,crown.inner));crownHotspotPath.setAttribute('d',ribbonPath(crownHot.outer,crownHot.inner));cyanReservoirPath.setAttribute('d',ribbonPath(cyan.outer,cyan.inner));
    const rightPin=ribbonFromAnchors(pts,normals,RIGHT_CROWN_PIN_ANCHORS,[.56,-.83],5.4,7.2,2.0,4.8),secondary=ribbonFromAnchors(pts,normals,SECONDARY_ANCHORS,[.84,-.54],8,10,2.2,5.2),leftLobeVolumeRig=ribbonFromAnchors(pts,normals,LEFT_LOBE_ANCHORS,[-.95,-.18],1.2,4.0,7.0,11.0),rightLobeVolumeRig=ribbonFromAnchors(pts,normals,RIGHT_LOBE_ANCHORS,[.94,-.22],1.4,3.8,6.4,10.2),leftLobe=ribbonFromAnchors(pts,normals,LEFT_LOBE_ANCHORS,[-.95,-.18],2.4,7,2.2,5.8),rightLobe=ribbonFromAnchors(pts,normals,RIGHT_LOBE_ANCHORS,[.94,-.22],3.2,6,1.8,4.2);
    rightCrownPin.setAttribute('d',ribbonPath(rightPin.outer,rightPin.inner));secondaryCore.setAttribute('d',ribbonPath(secondary.outer,secondary.inner));leftLobeShade.setAttribute('d',ribbonPath(leftLobeVolumeRig.outer,leftLobeVolumeRig.inner));rightLobeShade.setAttribute('d',ribbonPath(rightLobeVolumeRig.outer,rightLobeVolumeRig.inner));leftLobeVolume.setAttribute('d',ribbonPath(leftLobeVolumeRig.outer,leftLobeVolumeRig.inner));rightLobeVolume.setAttribute('d',ribbonPath(rightLobeVolumeRig.outer,rightLobeVolumeRig.inner));leftLobeGlint.setAttribute('d',ribbonPath(leftLobe.outer,leftLobe.inner));rightLobeGlint.setAttribute('d',ribbonPath(rightLobe.outer,rightLobe.inner));leftLobeAura.setAttribute('d',ribbonPath(leftLobe.outer,leftLobe.inner));rightLobeAura.setAttribute('d',ribbonPath(rightLobe.outer,rightLobe.inner));
    rightRim.setAttribute('d',openSpline(centerlineFromAnchors(pts,normals,[5.76,5.92,6.08,6.24,.12,.28,.44],[.86,.42],.6,1.8)));
    renderCosmicFlecks(mesh);setRecess(eyeLRecess,faceAnchors.eyeL,24,11);setRecess(eyeRRecess,faceAnchors.eyeR,24,11);setRecess(mouthRecess,faceAnchors.mouth,30,10);
  }

  function render(now){
    const scriptStarted=performance.now(),dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;if(!paused)elapsed+=dt;
    if(!paused&&emotionDemoMode&&!runtimeDormant){emotionDemoClock+=dt;const hold=2.65;if(emotionDemoClock>=hold){emotionDemoClock=0;emotionDemoIndex=(emotionDemoIndex+1)%EMOTION_DEMO_SEQUENCE.length;setEmotionFixture(EMOTION_DEMO_SEQUENCE[emotionDemoIndex],{source:'demo'});}}
    let morphProfileId=silhouetteProfile,nextMorphProfileId=silhouetteProfile,morphMix=0;
    if(manualMorph){
      morphProfileId=manualMorph.from;nextMorphProfileId=manualMorph.to;morphMix=manualMorph.mix;silhouetteProfile=morphProfileId;
    }else if(demoMode){
      const cycle=DEMO_HOLD_SECONDS+DEMO_MORPH_SECONDS,phase=elapsed%cycle;
      if(phase<demoLastPhase){demoIndex=(demoIndex+1)%DEMO_SEQUENCE.length;silhouetteProfile=DEMO_SEQUENCE[demoIndex];applyFormPresence();applyLayerVisibility();renderSilhouetteProfileButtons();}
      demoLastPhase=phase;morphProfileId=DEMO_SEQUENCE[demoIndex];nextMorphProfileId=DEMO_SEQUENCE[(demoIndex+1)%DEMO_SEQUENCE.length];
      if(phase>DEMO_HOLD_SECONDS){const t=(phase-DEMO_HOLD_SECONDS)/DEMO_MORPH_SECONDS;morphMix=smoothstep(0,1,Math.max(0,Math.min(1,t)));}
    }
    avatar.style.opacity='1';
    if(frameMetrics.lastFrameAt){const interval=now-frameMetrics.lastFrameAt;frameMetrics.frameIntervalMs.push(interval);if(interval>25)frameMetrics.droppedFrames+=1;}frameMetrics.lastFrameAt=now;
    const cycleSeconds=fixedIdlePhase===null?elapsed:fixedIdlePhase*IDLE_CYCLE_SECONDS;
    const idle=reducedMotion?idleCycleAt(0):idleCycleAt(cycleSeconds);
    const motionStrength=reducedMotion?0:Number(motion.value);
    const alpha=1-Math.exp(-dt/.30);
    Object.keys(current).forEach(k=>{if(typeof current[k]==='number'&&typeof target[k]==='number')current[k]=lerp(current[k],target[k],alpha);});
    const motionFrameState=composeFixtureMotion(current,reducedMotion?0:cycleSeconds,motionStrength);
    const frameState=adaptFixtureToEmbodiment(motionFrameState,morphProfileId,nextMorphProfileId,morphMix);
    const glowTau=Math.max(.05,.10+(frameState.glowLag||.12));laggedEnergy=lerp(laggedEnergy,frameState.energy,1-Math.exp(-Math.max(.001,dt)/glowTau));
    const svgStarted=performance.now(),topologyStarted=performance.now();
    const anchorsA=createFaceSurfaceAnchorsFor(morphProfileId),semanticContourA=sampleBodyForProfile(morphProfileId,frameState,reducedMotion?0:cycleSeconds),meshA=distributedMeshPointsFor(semanticContourA,morphProfileId,frameState,anchorsA),ptsA=applyMeshWarp(semanticContourA,meshA);
    let semanticContour=ptsA,mesh=meshA,pts=ptsA,activeFaceAnchors=createFaceSurfaceAnchorsFor(morphProfileId),formProfile=FORM_PROFILES[morphProfileId];
    if(morphMix>0.0001){
      const anchorsB=createFaceSurfaceAnchorsFor(nextMorphProfileId),semanticContourB=sampleBodyForProfile(nextMorphProfileId,frameState,reducedMotion?0:cycleSeconds),meshB=distributedMeshPointsFor(semanticContourB,nextMorphProfileId,frameState,anchorsB),ptsB=applyMeshWarp(semanticContourB,meshB);
      semanticContour=blendPointSets(semanticContourA,semanticContourB,morphMix);mesh=blendPointSets(meshA,meshB,morphMix);pts=blendPointSets(ptsA,ptsB,morphMix);activeFaceAnchors=blendFaceAnchors(createFaceSurfaceAnchorsFor(morphProfileId),createFaceSurfaceAnchorsFor(nextMorphProfileId),morphMix);formProfile=blendProfiles(FORM_PROFILES[morphProfileId],FORM_PROFILES[nextMorphProfileId],morphMix);
    }
    const singularityWeight=profileWeight(morphProfileId,nextMorphProfileId,morphMix,'singularity');
    const orbitWeight=profileWeight(morphProfileId,nextMorphProfileId,morphMix,'dormant-orbit');
    const dormantFamilyWeight=Math.max(0,Math.min(1,singularityWeight+orbitWeight));
    const cometWeight=profileWeight(morphProfileId,nextMorphProfileId,morphMix,'comet');
    const lowOrbitWeight=profileWeight(morphProfileId,nextMorphProfileId,morphMix,'low-orbit');
    let faceVisibility=lerp(profileFaceWeight(morphProfileId),profileFaceWeight(nextMorphProfileId),morphMix);
    if(nextMorphProfileId==='singularity'&&FORM_PROFILES[morphProfileId].face)faceVisibility*=1-smoothstep(.12,.48,morphMix);
    if(morphProfileId==='singularity'&&FORM_PROFILES[nextMorphProfileId].face)faceVisibility*=smoothstep(.52,.88,morphMix);
    const shellOpacity=lerp(profileShellOpacity(morphProfileId),profileShellOpacity(nextMorphProfileId),morphMix);
    const dynamicFaceTransform=viewFaceTransform(formProfile);faceRecessLayer.setAttribute('transform',dynamicFaceTransform);faceEmissionLayer.setAttribute('transform',dynamicFaceTransform);expressionShellLayer.setAttribute('transform',dynamicFaceTransform);expressionOcclusionLayer.setAttribute('transform',dynamicFaceTransform);
    faceRecessLayer.style.opacity=faceVisibility.toFixed(3);faceEmissionLayer.style.opacity=faceVisibility.toFixed(3);chromaticShell.setAttribute('opacity',shellOpacity.toFixed(3));
    const lobeVisibility=Math.max(0,1-lowOrbitWeight-.68*cometWeight);containedLobeMaterial.setAttribute('opacity',lobeVisibility.toFixed(3));exteriorAuraLayer.setAttribute('opacity',(lobeVisibility*.34).toFixed(3));
    avatar.dataset.formProfile=morphMix<.5?morphProfileId:nextMorphProfileId;avatar.dataset.morphFrom=morphProfileId;avatar.dataset.morphTo=nextMorphProfileId;avatar.dataset.morphMix=morphMix.toFixed(4);
    frameMetrics.topologyMs.push(performance.now()-topologyStarted);
    const normalStarted=performance.now(),normals=computeNormals(pts);
    frameMetrics.normalMs.push(performance.now()-normalStarted);
    const bodyD=closedSpline(pts);lastPoints=pts;lastMeshPoints=mesh;body.setAttribute('d',bodyD);clipBody.setAttribute('d',bodyD);
    const key=ribbonFromAnchors(pts,normals,KEY_ANCHORS,[-.72,-.69],5.5,12.5,7.2,16),core=ribbonFromAnchors(pts,normals,KEY_ANCHORS,[-.72,-.69],8.8,12.4,2.8,7.2),fill=ribbonFromAnchors(pts,normals,FILL_ANCHORS,[.88,-.46],8,11,3.2,7.2);
    const keyD=ribbonPath(key.outer,key.inner),fillD=ribbonPath(fill.outer,fill.inner);keyHalo.setAttribute('d',keyD);keyBand.setAttribute('d',keyD);keyCore.setAttribute('d',ribbonPath(core.outer,core.inner));fillHalo.setAttribute('d',fillD);fillBand.setAttribute('d',fillD);rim.setAttribute('d',openSpline(centerlineFromAnchors(pts,normals,RIM_ANCHORS,[.76,.65],1,2)));bounce.setAttribute('d',openSpline(centerlineFromAnchors(pts,normals,BOUNCE_ANCHORS,[0,-1],5.5,2.8)));
    const horizonAnchors=[2.96,3.18,3.40,3.62,3.84,4.06,4.28,4.50,4.72,4.94,5.16],lensCoordinates=[[9,17],[9,18],[9,19],[9,20],[9,21],[9,22],[9,23],[9,0],[9,1],[9,2],[9,3],[9,4],[9,5],[9,6],[9,7]];
    renderAccretionDisc(pts,formProfile,idle,motionStrength,{singularity:singularityWeight,orbit:orbitWeight});
    renderCometHeadWakeFlow(pts,cometWeight,idle,motionStrength);
    renderViewTail(pts,formProfile);
    const horizonD=openSpline(meshCurve(mesh,lensCoordinates)),dedicatedSingularity=singularityWeight>.001;
    horizonLens.setAttribute('d',dedicatedSingularity?'':horizonD);horizonBloom.setAttribute('d',dedicatedSingularity?'':horizonD);horizonLens.setAttribute('opacity',(formProfile.horizon*.48*(1-singularityWeight)).toFixed(3));horizonBloom.setAttribute('opacity',(formProfile.horizon*.12*(1-singularityWeight)).toFixed(3));
    accretionArc.setAttribute('d',dedicatedSingularity?'':openSpline(centerlineFromAnchors(pts,normals,horizonAnchors,[-.62,-.78],-2.0,-1.4)));accretionArc.setAttribute('opacity',(formProfile.horizon*.82*(1-singularityWeight)).toFixed(3));
    renderMaterialRig(pts,normals,mesh,activeFaceAnchors);
    renderAdaptiveRelief(pts,formProfile);
    applyViewLobeParallax(formProfile);
    const eyeLOffset=resolveFaceAnchorOffset(activeFaceAnchors.eyeL),eyeROffset=resolveFaceAnchorOffset(activeFaceAnchors.eyeR),mouthOffset=resolveFaceAnchorOffset(activeFaceAnchors.mouth),viewMetrics=getViewMetrics(formProfile);
    const faceProjection=SidekickFacePlane.projectFacePlane(FACE_PLANE,{yawDegrees:viewYawDegrees,anchorShift:viewMetrics.faceShift,compression:viewMetrics.faceCompression,offsets:{leftEye:[0,-current.eyeLiftL],rightEye:[0,-current.eyeLiftR],mouth:[0,0]}});
    const eyeWidthScale=formProfile.eyeWidthScale||1,eyeOpenScale=formProfile.eyeOpenScale||1,mouthYShift=formProfile.mouthYShift||0,mouthScale=formProfile.mouthScale||1,mouthOpenScale=formProfile.mouthOpenScale||1;
    const eyeOpenL=frameState.eyeOpenL*eyeOpenScale*(1-idle.blink*.92)*(1-.12*viewMetrics.amount),eyeOpenR=frameState.eyeOpenR*eyeOpenScale*(1-idle.blink*.92)*(1+.06*viewMetrics.amount);
    setTriplet(eyeL,eyeLBloom,eyeLShadow,eyePath(faceProjection.leftEye.x,faceProjection.leftEye.y,faceProjection.leftEye.width*eyeWidthScale*(frameState.eyeWidthL||1),eyeOpenL,frameState.eyeTiltL),.9,eyeLOffset);setTriplet(eyeR,eyeRBloom,eyeRShadow,eyePath(faceProjection.rightEye.x,faceProjection.rightEye.y,faceProjection.rightEye.width*eyeWidthScale*(frameState.eyeWidthR||1),eyeOpenR,frameState.eyeTiltR),.9,eyeROffset);
    const mouthState=mouthOpenScale===1?frameState:{...frameState,mouthOpen:frameState.mouthOpen*mouthOpenScale};
    setTriplet(mouth,mouthBloom,mouthShadow,mouthPath(mouthState),.75,{x:mouthOffset.x+faceProjection.mouth.x-121,y:mouthOffset.y+faceProjection.mouth.y-140+mouthYShift},1.18*faceProjection.transform.compression*mouthScale);
    renderExpressionShell(faceProjection,activeFaceAnchors,frameState,faceVisibility);
    const e=Number(interiorEnergy.value)*laggedEnergy;violetFieldNode.setAttribute('opacity',Math.max(.10,Math.min(.52,.55*e)).toFixed(3));cyanFieldNode.setAttribute('opacity',Math.max(.14,Math.min(.68,.62*e)).toFixed(3));faceFieldNode.setAttribute('opacity',Math.max(.18,Math.min(.72,.92*e)).toFixed(3));
    const stateMotion=motionStrength*(frameState.motionGain??.72),idleX=idle.driftX*stateMotion+frameState.postureX*.15,idleY=idle.liftY*stateMotion+frameState.postureY*.10,idleScaleX=1+(idle.scaleX-1)*stateMotion,idleScaleY=1+(idle.scaleY-1)*stateMotion;
    idleRig.setAttribute('transform',`translate(${idleX.toFixed(3)} ${idleY.toFixed(3)}) translate(120 110) scale(${idleScaleX.toFixed(5)} ${idleScaleY.toFixed(5)}) translate(-120 -110)`);
    violetFieldNode.setAttribute('transform',`translate(${(idle.reflectionX*.78*motionStrength-2.6*viewMetrics.amount).toFixed(2)} ${(idle.reflectionY*.72*motionStrength).toFixed(2)}) rotate(${(Math.sin(idle.phase*Math.PI*2)*1.8*motionStrength).toFixed(2)} 106 100)`);cyanFieldNode.setAttribute('transform',`translate(${(idle.reservoirX*motionStrength+3.4*viewMetrics.amount).toFixed(2)} ${(idle.reservoirY*motionStrength+.8*viewMetrics.amount).toFixed(2)})`);
    keyReflectionLayer.setAttribute('transform',`translate(${(idle.reflectionX*motionStrength).toFixed(2)} ${(idle.reflectionY*motionStrength).toFixed(2)})`);secondaryReflectionLayer.setAttribute('transform',`translate(${(-idle.reflectionX*.36*motionStrength).toFixed(2)} ${(idle.reflectionY*.42*motionStrength).toFixed(2)})`);lobeGlintsLayer.setAttribute('transform',`translate(${(idle.lobeLag*motionStrength).toFixed(2)} 0)`);
    const minX=Math.min(...pts.map(point=>point.x)),maxX=Math.max(...pts.map(point=>point.x)),maxY=Math.max(...pts.map(point=>point.y)),width=maxX-minX;
    const regularGroundRx=width*.54+idle.breath*motionStrength*.46,regularGroundRy=17-idle.breath*motionStrength*.34,regularGroundCy=maxY+5-idleY*.18;
    const puddleGroundRx=width*.485,puddleGroundRy=6.1,puddleGroundCy=maxY+.85;
    ground.setAttribute('rx',lerp(regularGroundRx,puddleGroundRx,lowOrbitWeight).toFixed(2));ground.setAttribute('ry',lerp(regularGroundRy,puddleGroundRy,lowOrbitWeight).toFixed(2));ground.setAttribute('cy',lerp(regularGroundCy,puddleGroundCy,lowOrbitWeight).toFixed(2));ground.setAttribute('opacity',lerp(1-idle.breath*motionStrength*.06,.72,lowOrbitWeight).toFixed(3));
    const regularShadowRx=width*.31-idle.breath*motionStrength*.42,regularShadowRy=7-idle.breath*motionStrength*.18,regularShadowCy=maxY+1.4-idleY*.12;
    const puddleShadowRx=width*.455,puddleShadowRy=1.75,puddleShadowCy=maxY+.05;
    contactShadow.setAttribute('rx',lerp(regularShadowRx,puddleShadowRx,lowOrbitWeight).toFixed(2));contactShadow.setAttribute('ry',lerp(regularShadowRy,puddleShadowRy,lowOrbitWeight).toFixed(2));contactShadow.setAttribute('cy',lerp(regularShadowCy,puddleShadowCy,lowOrbitWeight).toFixed(2));contactShadow.setAttribute('opacity',lerp(.78,.64,lowOrbitWeight).toFixed(3));
    if(debugOn){debugEdges.setAttribute('d',meshEdgePath(mesh));debugPoints.replaceChildren(...mesh.map((p,i)=>{const c=document.createElementNS(NS,'circle');c.setAttribute('cx',p.x.toFixed(2));c.setAttribute('cy',p.y.toFixed(2));c.setAttribute('r',i===selectedVertex?'1.8':'.55');c.setAttribute('data-vertex',String(i));return c;}));renderFaceAnchorDebug();}
    const edited=meshOffsets.reduce((count,offset)=>count+(Math.abs(offset.x)>.001||Math.abs(offset.y)>.001?1:0),0);
    const visibleLayers=[...layerVisibility.values()].filter(Boolean).length;
    const visibleSeconds=idle.phase*IDLE_CYCLE_SECONDS;$('idleCycleBar').style.width=`${(idle.phase*100).toFixed(2)}%`;$('idleCycleStatus').textContent=reducedMotion?'Idle · reduced motion':`Idle · ${visibleSeconds.toFixed(1)} / ${IDLE_CYCLE_SECONDS.toFixed(1)} s`;
    $('readout').innerHTML=`<strong>${formProfile.label.toUpperCase()}</strong><br>${formProfile.note}<br><br><div class="kv"><strong>Geometry</strong><span>decoupled adaptive expression surface</span><strong>View</strong><span>${viewYawDegrees.toFixed(0)}° authored spike · full rotation pending</span><strong>Preview</strong><span>${previewSize}px desktop proof</span><strong>Contour</strong><span>${CONTOUR_SAMPLES} render samples</span><strong>Structure</strong><span>${STRUCTURAL_NODES} nodes / ${ARTICULATION_MESH.triangles.length} triangles</span><strong>Relief</strong><span>${reliefPreset} · ${activeReliefSamples}/${RELIEF_SAMPLES} samples · ${detailTier}</span><strong>Material</strong><span>${materialProfile} · ${visibleLayers}/${MATERIAL_MESH_BINDINGS.length} sources</span><strong>Motion</strong><span>${reducedMotion?'static equivalent':`native ${IDLE_CYCLE_SECONDS}s living hold · ${(idle.phase*100).toFixed(0)}%`}</span><strong>Edited</strong><span>${edited} mesh offsets</span><strong>Presence</strong><span>${faceVisibility>.01?'face active':'featureless dormant identity'}</span><strong>Morph</strong><span>${morphProfileId} → ${nextMorphProfileId} · ${(morphMix*100).toFixed(0)}%</span><strong>Emotion</strong><span>${emotionFamily} · ${EMOTION_FIXTURES[state].label}</span><strong>Transition</strong><span>${transitionFromFixture} → ${transitionToFixture} · ${(transitionProgress(now)*100).toFixed(0)}%</span><strong>Interruptions</strong><span>${interruptionCount}</span></div>`;
    updateRuntimeLabels(now);
    frameMetrics.svgMs.push(performance.now()-svgStarted);const scriptMs=performance.now()-scriptStarted;frameMetrics.frames+=1;frameMetrics.scriptMs.push(scriptMs);for(const values of [frameMetrics.scriptMs,frameMetrics.topologyMs,frameMetrics.normalMs,frameMetrics.reliefMs,frameMetrics.reliefEvaluationMs,frameMetrics.reliefNormalMs,frameMetrics.svgMs,frameMetrics.frameIntervalMs])while(values.length>METRIC_WINDOW)values.shift();
    if(proofMode)proofFramePending=false;else requestAnimationFrame(render);
  }

  referenceToggle.onclick=()=>{const collapsed=referencePanel.classList.toggle('collapsed');referenceToggle.textContent=collapsed?'Show reference':'Hide reference';referenceToggle.setAttribute('aria-expanded',String(!collapsed));};
  $('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume motion':'Pause motion';};
  $('restartIdle').onclick=()=>{elapsed=0;manualMorph=null;demoMode=query.get('demo')==='1';emotionDemoClock=0;paused=false;$('pause').textContent='Pause motion';};
  $('emotionDemo').onclick=()=>{emotionDemoMode=!emotionDemoMode;emotionDemoClock=0;emotionDemoIndex=Math.max(0,EMOTION_DEMO_SEQUENCE.indexOf(state));updateRuntimeLabels();};
  $('interruptBlocked').onclick=()=>interruptEmotion('blocked',0);
  $('enterDormant').onclick=()=>enterDormantBehavior('dormant-orbit');
  $('wakePresence').onclick=()=>wakeBehavior();
  $('conversationSequence').onclick=()=>runConversationSequence();
  $('cancelBehavior').onclick=()=>cancelBehavior();
  $('behaviorSingularity').onclick=()=>enterDormantBehavior('singularity');
  $('behaviorOrbit').onclick=()=>enterDormantBehavior('dormant-orbit');
  $('behaviorWake').onclick=()=>wakeBehavior();
  $('behaviorRouteDemo').onclick=async()=>{await morphToBehavioral('comet',{durationMs:760});await morphToBehavioral('low-orbit',{durationMs:980});await morphToBehavioral('dormant-orbit',{durationMs:980});};
  $('debugToggle').onclick=()=>{debugOn=!debugOn;debug.setAttribute('opacity',debugOn?'1':'0');stage.classList.toggle('editing',debugOn);$('debugToggle').textContent=debugOn?'Finish mesh inspection':'Inspect mesh';};
  $('resetMesh').onclick=()=>{meshOffsets.forEach(offset=>{offset.x=0;offset.y=0;});};
  $('exportMesh').onclick=()=>{const payload={schema:6,rig:'sidekickex-v6.5.5-gasper-behavioral-continuity',contourSamples:CONTOUR_SAMPLES,structuralNodes:STRUCTURAL_NODES,reliefSamples:RELIEF_SAMPLES,triangleCount:ARTICULATION_MESH.triangles.length,vertices:ARTICULATION_MESH.vertices.map(vertex=>({...vertex,offset:meshOffsets[vertex.index]})),triangles:ARTICULATION_MESH.triangles,materialLayers:MATERIAL_MESH_BINDINGS.map(([key])=>key)};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='sidekickex-v6.5.5-gasper-behavioral-continuity.json';link.click();URL.revokeObjectURL(link.href);};
  $('allLayers').onclick=()=>setLayerPreset('master');$('baselineLayers').onclick=()=>setLayerPreset('baseline');
  $('reset').onclick=()=>{state='neutral-settled';emotionFamily='neutral';fixtureIndex=0;transitionFromFixture=state;transitionToFixture=state;transitionStartedAt=performance.now();transitionDuration=EMOTION_FIXTURES[state].transitionSeconds;transitionSerial=0;interruptionCount=0;emotionDemoMode=false;runtimeDormant=false;activeMicrostate=null;activeFixtureBlend=null;behaviorMorphSerial+=1;conversationSerial+=1;behaviorMorphStatus='idle';behaviorProgress=0;laggedEnergy=EMOTION_FIXTURES['neutral-settled'].energy;silhouetteProfile='presence';setYaw(0);BASE_CONTOUR=createBaseContour();FACE_SURFACE_ANCHORS=createFaceSurfaceAnchors();current={...EMOTION_FIXTURES[state]};target={...EMOTION_FIXTURES[state]};activeReliefMode='none';elapsed=0;paused=false;debugOn=false;selectedVertex=-1;meshOffsets.forEach(offset=>{offset.x=0;offset.y=0;});debug.setAttribute('opacity','0');stage.classList.remove('editing');coupling.value='1';motion.value='.72';interiorEnergy.value='.72';$('pause').textContent='Pause motion';$('debugToggle').textContent='Inspect mesh';setLayerPreset('master');setPreviewSize(320);setDetailTier('adaptive');setReliefPreset('none');setContainmentMode('all');applyFormPresence();renderSilhouetteProfileButtons();renderEmotionButtons();renderFixtureButtons();syncLabels();updateRuntimeLabels();};
  [coupling,motion,interiorEnergy].forEach(el=>el.addEventListener('input',syncLabels));yaw.addEventListener('input',()=>setYaw(yaw.value));
  const requestedLayer=query.get('layer');
  if(requestedLayer&&layerVisibility.has(requestedLayer)){MATERIAL_MESH_BINDINGS.forEach(([key])=>layerVisibility.set(key,key===requestedLayer));materialProfile='custom';}
  else if(materialProfile==='baseline')MATERIAL_MESH_BINDINGS.forEach(([key])=>layerVisibility.set(key,baselineLayerSet.has(key)));
  function metricSummary(values){if(!values.length)return{samples:0,mean:0,median:0,p95:0,max:0};const sorted=[...values].sort((a,b)=>a-b),sum=values.reduce((total,value)=>total+value,0),at=quantile=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*quantile))];return{samples:values.length,mean:sum/values.length,median:at(.5),p95:at(.95),max:sorted[sorted.length-1]};}
  function resetFrameMetrics(){for(const key of ['scriptMs','topologyMs','normalMs','reliefMs','reliefEvaluationMs','reliefNormalMs','svgMs','frameIntervalMs'])frameMetrics[key].length=0;frameMetrics.frames=0;frameMetrics.longTasks=0;frameMetrics.droppedFrames=0;frameMetrics.lastFrameAt=performance.now();}
  globalThis.SidekickFormMasterRig={
    setPaused(value){paused=Boolean(value);$('pause').textContent=paused?'Resume motion':'Pause motion';},
    setMotion(value){motion.value=String(Math.max(0,Math.min(1,Number(value)||0)));syncLabels();},
    setProfile(value){manualMorph=null;demoMode=false;setSilhouetteProfile(value);},
    setEmotion(family,index=0){emotionDemoMode=false;setEmotionFamily(family,index,{source:'api'});},
    setFixture(id){emotionDemoMode=false;setEmotionFixture(id,{source:'api'});},
    setFixtureImmediate(id){emotionDemoMode=false;setFixtureImmediate(id);},
    setExpressionPreview(from,to,mix){emotionDemoMode=false;setExpressionPreview(from,to,mix);},
    getExpressionState(){return{...current};},
    interrupt(family='blocked',index=0){emotionDemoMode=false;interruptEmotion(family,index);},
    setEmotionDemo(value){emotionDemoMode=Boolean(value);emotionDemoClock=0;emotionDemoIndex=Math.max(0,EMOTION_DEMO_SEQUENCE.indexOf(state));updateRuntimeLabels();},
    enterDormant(profile='dormant-orbit'){enterDormant(profile);},
    wake(options){return wakeBehavior(options);},
    enterDormantBehavior(profile='dormant-orbit',options){return enterDormantBehavior(profile,options);},
    triggerMicrostate(id,options){return triggerMicrostate(id,options);},
    setMicrostateProgress(id,progress,strength=1){return setMicrostateProgress(id,progress,strength);},
    clearMicrostate(){return clearMicrostate();},
    setFixtureBlend(family,weights,options){return setFixtureBlend(family,weights,options);},
    getBehaviorState(){return getBehaviorState();},
    morphToBehavioral(name,options){return morphToBehavioral(name,options);},
    runConversationSequence(options){return runConversationSequence(options);},
    cancelBehavior(){return cancelBehavior();},
    listEmotionFamilies(){return EMOTION_ORDER.map(family=>({family,fixtures:EMOTION_FAMILIES[family].map(id=>({id,label:EMOTION_FIXTURES[id].label,note:EMOTION_FIXTURES[id].note}))}));},
    getEmotionSnapshot(){return{family:emotionFamily,fixture:state,from:transitionFromFixture,to:transitionToFixture,progress:transitionProgress(),interruptionCount,emotionDemoMode,runtimeDormant,allowedTransitions:[...(EMOTION_TRANSITION_GRAPH[emotionFamily]||[])]};},
    setMorphPreview(from,to,mix){if(!FORM_PROFILES[from]||!FORM_PROFILES[to])throw new TypeError('unknown morph profile');manualMorph={from,to,mix:Math.max(0,Math.min(1,Number(mix)||0))};demoMode=false;silhouetteProfile=from;applyFormPresence();renderSilhouetteProfileButtons();},
    clearMorphPreview(){manualMorph=null;demoMode=false;},
    setDemoMode(value){manualMorph=null;demoMode=Boolean(value);elapsed=0;demoLastPhase=0;},
    setYaw(value){setYaw(value);},
    setDetailTier(value){setDetailTier(value);},
    setReliefPreset(value){setReliefPreset(value);},
    setContainmentMode(value){setContainmentMode(value);},
    resetFrameMetrics(){resetFrameMetrics();},
    getSnapshot(){const profile=FORM_PROFILES[silhouetteProfile],view=getViewMetrics(profile),depths=lastMeshPoints.map(point=>point.projectedDepth).filter(Number.isFinite);return{candidate:'v6.5.5-gasper-behavioral-continuity',profile:silhouetteProfile,morph:manualMorph?{...manualMorph}:null,demoMode,geometryModel:profile.geometryModel||'radial-shared-topology',containmentMode,paused,motion:Number(motion.value),contourSamples:CONTOUR_SAMPLES,structuralNodes:STRUCTURAL_NODES,structuralTriangles:ARTICULATION_MESH.triangles.length,reliefSamples:RELIEF_SAMPLES,activeReliefSamples,detailTier,reliefPreset,featureless:!profile.face,discStrength:profile.disc||0,lensedStrength:profile.lensed||0,tailPolicy:profile.tailPolicy||'not-applicable',viewYawDegrees,topologyStable:true,materialReprojected:true,projection:view.projection,projectedDepthRange:depths.length?[Math.min(...depths),Math.max(...depths)]:[0,0],viewDepthRole:view.viewDepthRole,tailOpacity:0,discPerspective:view.discPerspective,rotationReady:false,productionReady:false,viewRig:VIEW_RIG_CONTRACT,emotionFamily,emotionFixture:state,emotionTransition:{from:transitionFromFixture,to:transitionToFixture,progress:transitionProgress(),serial:transitionSerial},interruptionCount,emotionDemoMode,runtimeDormant,fixtureCount:Object.keys(EMOTION_FIXTURES).length,emotionFamilyCount:EMOTION_ORDER.length,dormantFamilyNative:true,detachedSingularityLayer:false,dormantContinuum:{singularityWeight:manualMorph?profileWeight(manualMorph.from,manualMorph.to,manualMorph.mix,'singularity'):(silhouetteProfile==='singularity'?1:0),orbitWeight:manualMorph?profileWeight(manualMorph.from,manualMorph.to,manualMorph.mix,'dormant-orbit'):(silhouetteProfile==='dormant-orbit'?1:0)},behavior:getBehaviorState(),fixtureBlendActive:Boolean(activeFixtureBlend),microstateActive:activeMicrostate?.id||null,embodimentRoutePolicy:'continuity-preserving-recovery',emotionalCurrentStateRetargeting:true,dormantContextRestoration:true};},
    getFrameMetrics(){return{frames:frameMetrics.frames,droppedFrames:frameMetrics.droppedFrames,longTasks:frameMetrics.longTasks,script:metricSummary(frameMetrics.scriptMs),topology:metricSummary(frameMetrics.topologyMs),normalDerivation:metricSummary(frameMetrics.normalMs),relief:metricSummary(frameMetrics.reliefMs),reliefEvaluation:metricSummary(frameMetrics.reliefEvaluationMs),reliefNormalDerivation:metricSummary(frameMetrics.reliefNormalMs),svgMutation:metricSummary(frameMetrics.svgMs),frameInterval:metricSummary(frameMetrics.frameIntervalMs),targetHz:Number(query.get('hz'))||60};},
    getBenchmarkSamples(){return{scriptMs:[...frameMetrics.scriptMs],topologyMs:[...frameMetrics.topologyMs],normalMs:[...frameMetrics.normalMs],reliefMs:[...frameMetrics.reliefMs],reliefEvaluationMs:[...frameMetrics.reliefEvaluationMs],reliefNormalMs:[...frameMetrics.reliefNormalMs],svgMs:[...frameMetrics.svgMs],frameIntervalMs:[...frameMetrics.frameIntervalMs]};},
  };
  globalThis.SidekickAdaptiveRig=globalThis.SidekickFormMasterRig;globalThis.SidekickFormRig=globalThis.SidekickFormMasterRig;
  const gasperRuntimeEvents=new Map();
  let gasperDeterministicTimeMs=null;
  let gasperDeterministicSeed=654;
  let gasperMorphSerial=0;
  const gasperCapabilities=Object.freeze({
    nativeContract:true,
    semanticEmbodiments:true,
    emotionalFixtures:true,
    deterministicTime:true,
    deterministicSeed:true,
    exactMorphProgress:true,
    currentStateRetargeting:true,
    frameMetrics:true,
    geometryMetrics:true,
    subscriptions:true,
    behavioralContinuity:true,
    microstates:true,
    fixtureBlending:true,
    dormantContextMemory:true,
    routeGovernedMorphology:true,
    conversationSequence:true,
    emotionalCurrentStateRetargeting:true,
    arbitraryMidMorphRetargeting:false,
    rotationReady:false,
    productionReady:false,
  });
  function gasperEmit(name,detail={}){const listeners=gasperRuntimeEvents.get(name);if(listeners)for(const callback of [...listeners]){try{callback({type:name,detail,timestamp:Date.now()});}catch(error){console.error(error);}}}
  function gasperBodyReady(){const bodyPath=$('body');return Boolean(bodyPath&&typeof bodyPath.getAttribute('d')==='string'&&bodyPath.getAttribute('d').length>1000);}
  function gasperMetadata(){const snapshot=globalThis.SidekickFormMasterRig.getSnapshot();return{character:GASPER_IDENTITY,version:'6.5.5',candidate:'v6.5.5-gasper-behavioral-continuity',baseline:'v6.5.4-gasper-identity-lock',identityLock:'v1',behaviorConstitution:'v1',runtimeAdapter:'native_contract',capabilities:gasperCapabilities,protected:{presence:true,contourSamples:CONTOUR_SAMPLES,structuralNodes:STRUCTURAL_NODES,structuralTriangles:ARTICULATION_MESH.triangles.length,topologyStable:true,worldSpaceLighting:true,facePlane:true,materialLanguage:'dark-pearl-urethane'},readiness:{document:document.readyState,bodyPath:gasperBodyReady(),firstFrame:frameMetrics.frames>0},snapshot};}
  function gasperListEmbodiments(){return Object.entries(FORM_PROFILES).map(([id,profile])=>({id,label:profile.label,note:profile.note,face:Boolean(profile.face),geometryModel:profile.geometryModel||'radial-shared-topology',dormantFamily:id==='singularity'||id==='dormant-orbit'}));}
  function gasperListFixtures(family){if(!EMOTION_FAMILIES[family])throw new TypeError('unknown emotion family');return EMOTION_FAMILIES[family].map(id=>({id,label:EMOTION_FIXTURES[id].label,note:EMOTION_FIXTURES[id].note,family}));}
  function gasperSetEmbodiment(name,options={}){if(!FORM_PROFILES[name])throw new TypeError('unknown embodiment');manualMorph=null;demoMode=false;setSilhouetteProfile(name);if(options.immediate!==false)applyFormPresence();gasperEmit('embodimentchange',{name,options});return gasperMetadata();}
  function gasperSetFixture(family,fixture,options={}){const id=fixture||EMOTION_FAMILIES[family]?.[0];if(!id||!EMOTION_FIXTURES[id]||EMOTION_FIXTURES[id].family!==family)throw new TypeError('unknown fixture');if(options.immediate)globalThis.SidekickFormMasterRig.setFixtureImmediate(id);else globalThis.SidekickFormMasterRig.setFixture(id);gasperEmit('fixturechange',{family,fixture:id,options});return gasperMetadata();}
  function gasperSetMorphProgress(from,to,progress){globalThis.SidekickFormMasterRig.setMorphPreview(from,to,Math.max(0,Math.min(1,Number(progress)||0)));gasperEmit('morphprogress',{from,to,progress:Math.max(0,Math.min(1,Number(progress)||0))});return gasperMetadata();}
  async function gasperMorphTo(name,options={}){if(!FORM_PROFILES[name])throw new TypeError('unknown embodiment');const serial=++gasperMorphSerial;const snapshot=globalThis.SidekickFormMasterRig.getSnapshot();const from=snapshot.morph?(snapshot.morph.mix>=.5?snapshot.morph.to:snapshot.morph.from):snapshot.profile;const duration=Math.max(0,Number(options.durationMs??900));if(duration===0){gasperSetEmbodiment(name);return gasperMetadata();}return new Promise(resolve=>{const started=performance.now();function step(now){if(serial!==gasperMorphSerial)return resolve(gasperMetadata());const p=Math.max(0,Math.min(1,(now-started)/duration));const eased=options.easing==='linear'?p:(p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2);gasperSetMorphProgress(from,name,eased);if(p<1)requestAnimationFrame(step);else{globalThis.SidekickFormMasterRig.clearMorphPreview();gasperSetEmbodiment(name);gasperEmit('settled',{embodiment:name});resolve(gasperMetadata());}}requestAnimationFrame(step);});}
  function gasperWaitFor(predicate,timeoutMs=3000){return new Promise((resolve,reject)=>{const started=performance.now();function check(){try{if(predicate())return resolve(gasperMetadata());}catch(error){return reject(error);}if(performance.now()-started>timeoutMs)return reject(new Error('SidekickEX runtime wait timed out'));requestAnimationFrame(check);}check();});}
  const GASPER_RUNTIME = {
    version:'6.5.5',
    character:'Gasper',
    capabilities:gasperCapabilities,
    get ready(){return document.readyState==='complete'&&gasperBodyReady()&&frameMetrics.frames>0;},
    getState(){return gasperMetadata();},
    getMetadata(){return gasperMetadata();},
    listEmbodiments(){return gasperListEmbodiments();},
    listEmotionalFamilies(){return EMOTION_ORDER.map(family=>({family,fixtures:gasperListFixtures(family)}));},
    listFixtures(family){return gasperListFixtures(family);},
    getCurrentEmbodiment(){const snapshot=globalThis.SidekickFormMasterRig.getSnapshot();return snapshot.morph?{...snapshot.morph}:snapshot.profile;},
    getCurrentFixture(){return{family:emotionFamily,fixture:state};},
    getBehaviorState(){return getBehaviorState();},
    listMicrostates(){return MICROSTATE_ORDER.map(id=>({id,...MICROSTATE_SCHEMA[id]}));},
    triggerMicrostate(id,options){return triggerMicrostate(id,options);},
    setMicrostateProgress(id,progress,strength=1){return setMicrostateProgress(id,progress,strength);},
    clearMicrostate(){return clearMicrostate();},
    setFixtureBlend(family,weights,options){return setFixtureBlend(family,weights,options);},
    getFixtureBlend(){return activeFixtureBlend?{...activeFixtureBlend,weights:[...activeFixtureBlend.weights]}:null;},
    getTransitionGrammar(){return{embodimentGraph:EMBODIMENT_TRANSITION_GRAPH,emotionGraph:EMOTION_TRANSITION_GRAPH,dormantRoutes:DORMANT_ENTRY_ROUTES,retargetPolicy:'continuity-preserving-recovery',arbitraryMidMorphRetargeting:false};},
    getStateGraph(){return{emotion:EMOTION_TRANSITION_GRAPH,embodiment:EMBODIMENT_TRANSITION_GRAPH};},
    getEmbodimentEmotionMatrix(){return EMBODIMENT_EMOTION_MATRIX;},
    enterDormant(profile='dormant-orbit',options){return enterDormantBehavior(profile,options);},
    wake(options){return wakeBehavior(options);},
    runConversationSequence(options){return runConversationSequence(options);},
    cancelBehavior(){return cancelBehavior();},
    setEmbodiment(name,options){return gasperSetEmbodiment(name,options);},
    setEmotionalFixture(family,fixture,options){return gasperSetFixture(family,fixture,options);},
    morphTo(name,options){return morphToBehavioral(name,options);},
    transitionToState(stateName,options={}){if(FORM_PROFILES[stateName])return morphToBehavioral(stateName,options);if(EMOTION_FAMILIES[stateName])return Promise.resolve(gasperSetFixture(stateName,options.fixture,options));throw new TypeError('unknown state');},
    setMorphProgress(from,to,progress){return gasperSetMorphProgress(from,to,progress);},
    setTransitionProgress(from,to,progress){return gasperSetMorphProgress(from,to,progress);},
    waitForReady(options={}){return gasperWaitFor(()=>GASPER_RUNTIME.ready,Number(options.timeoutMs)||5000);},
    waitForSettled(options={}){return gasperWaitFor(()=>transitionProgress()>=.999&&!demoMode&&!emotionDemoMode&&behaviorMorphStatus==='idle',Number(options.timeoutMs)||8000);},
    pause(){globalThis.SidekickFormMasterRig.setPaused(true);gasperEmit('pause');return gasperMetadata();},
    resume(){gasperDeterministicTimeMs=null;globalThis.SidekickFormMasterRig.setPaused(false);gasperEmit('resume');return gasperMetadata();},
    stepFrame(){globalThis.SidekickFormMasterRig.setPaused(true);elapsed+=1/60;render(performance.now());gasperEmit('frame',{elapsed});return gasperMetadata();},
    setDeterministicTime(milliseconds){gasperDeterministicTimeMs=Math.max(0,Number(milliseconds)||0);globalThis.SidekickFormMasterRig.setPaused(true);elapsed=gasperDeterministicTimeMs/1000;lastTime=performance.now();render(lastTime);gasperEmit('deterministictime',{milliseconds:gasperDeterministicTimeMs});return gasperMetadata();},
    setDeterministicSeed(seed){gasperDeterministicSeed=(Number(seed)||654)>>>0;document.documentElement.dataset.deterministicSeed=String(gasperDeterministicSeed);gasperEmit('deterministicseed',{seed:gasperDeterministicSeed});return gasperDeterministicSeed;},
    resetDeterminism(){gasperDeterministicTimeMs=null;gasperDeterministicSeed=654;document.documentElement.dataset.deterministicSeed='654';return gasperMetadata();},
    captureMetadata(){return gasperMetadata();},
    getPerformanceSnapshot(){return globalThis.SidekickFormMasterRig.getFrameMetrics();},
    getGeometryMetrics(){const snapshot=globalThis.SidekickFormMasterRig.getSnapshot();return{contourSamples:snapshot.contourSamples,structuralNodes:snapshot.structuralNodes,structuralTriangles:snapshot.structuralTriangles,reliefSamples:snapshot.reliefSamples,activeReliefSamples:snapshot.activeReliefSamples,topologyStable:snapshot.topologyStable,bodyPathLength:($('body').getAttribute('d')||'').length,projectedDepthRange:snapshot.projectedDepthRange};},
    subscribe(eventName,callback){if(typeof callback!=='function')throw new TypeError('callback must be a function');if(!gasperRuntimeEvents.has(eventName))gasperRuntimeEvents.set(eventName,new Set());gasperRuntimeEvents.get(eventName).add(callback);return()=>GASPER_RUNTIME.unsubscribe(eventName,callback);},
    unsubscribe(eventName,callback){return gasperRuntimeEvents.get(eventName)?.delete(callback)||false;},
  };
  globalThis.__SIDEKICKEX__=Object.freeze(GASPER_RUNTIME);
  document.documentElement.dataset.sidekickRuntime='native_contract';
  document.documentElement.dataset.character='gasper';
  addEventListener('message',event=>{const message=event.data;if(!message||message.type!=='sidekick-form-control')return;if('paused'in message)globalThis.SidekickFormMasterRig.setPaused(message.paused);if('motion'in message)globalThis.SidekickFormMasterRig.setMotion(message.motion);if('detailTier'in message)globalThis.SidekickFormMasterRig.setDetailTier(message.detailTier);if('reliefPreset'in message)globalThis.SidekickFormMasterRig.setReliefPreset(message.reliefPreset);if(message.morph)globalThis.SidekickFormMasterRig.setMorphPreview(message.morph.from,message.morph.to,message.morph.mix);if(message.emotion)globalThis.SidekickFormMasterRig.setEmotion(message.emotion.family,message.emotion.index||0);if(message.fixture)globalThis.SidekickFormMasterRig.setFixture(message.fixture);if(message.interrupt)globalThis.SidekickFormMasterRig.interrupt(message.interrupt.family||'blocked',message.interrupt.index||0);});
  renderMaterialLayerControls();renderMaterialProfileButtons();renderSilhouetteProfileButtons();renderEmotionButtons();renderFixtureButtons();renderBehaviorControls();renderPreviewButtons();renderAdaptiveControls();renderContainmentControls();setYaw(viewYawDegrees);applyEmotionRelief(EMOTION_FIXTURES[state]);setYaw(viewYawDegrees);applyFormPresence();applyLayerVisibility();syncLabels();updateRuntimeLabels();avatar.dataset.character='gasper';avatar.dataset.identityLock='v1';avatar.dataset.behaviorConstitution='v1';avatar.dataset.emotion=emotionFamily;avatar.dataset.fixture=state;if(proofMode)requestRuntimeFrame();else requestAnimationFrame(render);
  if(parent!==window)parent.postMessage({type:'sidekick-form-ready',profile:silhouetteProfile},'*');
})();
