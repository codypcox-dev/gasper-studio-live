
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
  const DETAIL_TOPOLOGY = SidekickAdaptiveMesh.createPolarTopology({ rings: 25, sectors: 40 }); // 1000-point canonical relief topology (25×40). VEC-201: retired the 4000-point HIGH tier — feature logo/glasses/embodiment bas-relief now samples the same DETAIL_TOPOLOGY with analytic primitives (no pixel heightmap).
  const FACE_PLANE = SidekickFacePlane.createFacePlane({center:[120,112],eyes:[[84,99],[156,99]],mouth:[121,140],eyeWidth:38});
  const RELIEF_PRESETS = Object.freeze({
    none:Object.freeze([]),
    brow_raise:Object.freeze([{kind:'brow_raise',u:.88,v:.47,radius:.105,amplitude:.76},{kind:'brow_raise',u:.12,v:.47,radius:.105,amplitude:.76}]),
    brow_knit:Object.freeze([{kind:'brow_knit',u:0,v:.43,radius:.115,amplitude:.88}]),
    cheek_dimple:Object.freeze([{kind:'cheek_dimple',u:.27,v:.55,radius:.10,amplitude:-.88}]),
    effort_pinches:Object.freeze([{kind:'effort_pinches',u:0,v:.47,radius:.15,amplitude:.78}]),
    goosebumps:Object.freeze([{kind:'goosebumps',u:.5,v:.58,radius:.62,amplitude:.92}]),
    goosebumps_soft:Object.freeze([{kind:'goosebumps',u:.5,v:.58,radius:.62,amplitude:.5}]),
  });
  const IDLE_CYCLE_SECONDS = 8;
  const AUTHORED_YAW_RANGE = Object.freeze([0,45]);
  const EMOTION_FIXTURES = Object.freeze({"neutral-settled":{"reliefMode":"none","eyeOpenL":0.55,"eyeOpenR":0.55,"eyeTiltL":-0.25,"eyeTiltR":0.25,"eyeLiftL":0,"eyeLiftR":0,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.50,"mouthOpen":0.05,"mouthCurve":0.30,"pullL":0.14,"pullR":0.14,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0,"crown":0,"energy":0.72,"browL":0,"browR":0,"cheekL":0,"cheekR":0,"tension":0.1,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.78,"motionGain":0.58,"holdBias":0.74,"microSeed":1.1,"glowLag":0.12,"transitionSeconds":0.72,"id":"neutral-settled","family":"neutral","label":"Settled","note":"Quiet, socially available resting state."},"neutral-social":{"reliefMode":"none","eyeOpenL":0.255,"eyeOpenR":0.255,"eyeTiltL":-1.2,"eyeTiltR":1.2,"eyeLiftL":0,"eyeLiftR":0,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.52,"mouthOpen":0.1,"mouthCurve":0.12,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0,"crown":0,"energy":0.76,"browL":0,"browR":0,"cheekL":0.08,"cheekR":0.08,"tension":0.12,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.92,"motionGain":0.64,"holdBias":0.5,"microSeed":2.2,"glowLag":0.12,"transitionSeconds":0.72,"id":"neutral-social","family":"neutral","label":"Social","note":"Slightly more open and receptive neutral."},"neutral-wry":{"reliefMode":"none","eyeOpenL":0.205,"eyeOpenR":0.235,"eyeTiltL":-2.0,"eyeTiltR":1.6,"eyeLiftL":0,"eyeLiftR":0,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.48,"mouthOpen":0.085,"mouthCurve":0.14,"pullL":0.01,"pullR":0.13,"mouthLift":0,"mouthSkew":0.08,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0.07,"crown":0,"energy":0.72,"browL":0,"browR":0,"cheekL":0,"cheekR":0,"tension":0.16,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.7,"motionGain":0.56,"holdBias":0.5,"microSeed":3.4,"glowLag":0.12,"transitionSeconds":0.72,"id":"neutral-wry","family":"neutral","label":"Wry","note":"Competent, understated asymmetry without overt mischief."},"listening-orient":{"reliefMode":"brow_raise","eyeOpenL":0.3,"eyeOpenR":0.275,"eyeTiltL":-2.1,"eyeTiltR":0.6,"eyeLiftL":-0.7,"eyeLiftR":-0.35,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.42,"mouthOpen":0.045,"mouthCurve":0.01,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0.09,"crown":0.1,"energy":0.86,"browL":0.28,"browR":0.16,"cheekL":0,"cheekR":0,"tension":0.12,"focusX":-0.14,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.08,"motionGain":0.7,"holdBias":0.5,"microSeed":4.2,"glowLag":0.12,"transitionSeconds":0.56,"id":"listening-orient","family":"listening","label":"Orient","note":"Attention turns toward incoming information."},"listening-hold":{"reliefMode":"brow_raise","eyeOpenL":0.285,"eyeOpenR":0.285,"eyeTiltL":-1.2,"eyeTiltR":1.2,"eyeLiftL":-0.45,"eyeLiftR":-0.45,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.4,"mouthOpen":0.035,"mouthCurve":0.0,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0,"crown":0.07,"energy":0.82,"browL":0.22,"browR":0.22,"cheekL":0,"cheekR":0,"tension":0.18,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.62,"motionGain":0.42,"holdBias":0.86,"microSeed":5.1,"glowLag":0.12,"transitionSeconds":0.72,"id":"listening-hold","family":"listening","label":"Hold","note":"Stable concentrated listening with reduced body noise."},"listening-receive":{"reliefMode":"none","eyeOpenL":0.62,"eyeOpenR":0.62,"eyeTiltL":-1.4,"eyeTiltR":1.0,"eyeLiftL":0,"eyeLiftR":0,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.47,"mouthOpen":0.06,"mouthCurve":0.08,"pullL":0.06,"pullR":0.09,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0,"crown":0.05,"energy":0.84,"browL":0,"browR":0,"cheekL":0.08,"cheekR":0.12,"tension":0.12,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.84,"motionGain":0.58,"holdBias":0.5,"microSeed":6.3,"glowLag":0.12,"transitionSeconds":0.72,"id":"listening-receive","family":"listening","label":"Receive","note":"Warm acknowledgement while continuing to listen."},"thinking-scan":{"reliefMode":"brow_knit","eyeOpenL":0.2,"eyeOpenR":0.255,"eyeTiltL":-3.2,"eyeTiltR":2.4,"eyeLiftL":0.25,"eyeLiftR":-0.55,"eyeWidthL":0.96,"eyeWidthR":1.04,"mouthWidth":0.39,"mouthOpen":0.035,"mouthCurve":-0.035,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":-0.08,"mouthPinch":0.22,"mouthRound":0,"wide":0,"low":0,"asym":0.17,"crown":0.1,"energy":0.8,"browL":-0.22,"browR":0.14,"cheekL":0,"cheekR":0,"tension":0.36,"focusX":0.22,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.76,"motionGain":0.5,"holdBias":0.5,"microSeed":7.2,"glowLag":0.12,"transitionSeconds":0.72,"id":"thinking-scan","family":"thinking","label":"Scan","note":"Internal search with lateral eye asymmetry."},"thinking-knit":{"reliefMode":"brow_knit","eyeOpenL":0.28,"eyeOpenR":0.28,"eyeTiltL":-4.1,"eyeTiltR":4.1,"eyeLiftL":0.35,"eyeLiftR":0.35,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.36,"mouthOpen":0.02,"mouthCurve":-0.35,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0.4,"mouthRound":0,"wide":0,"low":0.12,"asym":0,"crown":0.12,"energy":0.76,"browL":-0.36,"browR":-0.36,"cheekL":0,"cheekR":0,"tension":0.58,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.56,"motionGain":0.38,"holdBias":0.82,"microSeed":8.4,"glowLag":0.12,"transitionSeconds":0.72,"id":"thinking-knit","family":"thinking","label":"Knit","note":"Compressed analytical effort with local brow tension."},"thinking-resolve":{"reliefMode":"effort_pinches","eyeOpenL":0.205,"eyeOpenR":0.235,"eyeTiltL":-2.4,"eyeTiltR":1.2,"eyeLiftL":-0.1,"eyeLiftR":-0.35,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.44,"mouthOpen":0.095,"mouthCurve":0.06,"pullL":0.02,"pullR":0.11,"mouthLift":0,"mouthSkew":0.05,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0.08,"crown":0.08,"energy":0.88,"browL":-0.1,"browR":0.08,"cheekL":0,"cheekR":0,"tension":0.32,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.96,"motionGain":0.58,"holdBias":0.5,"microSeed":9.6,"glowLag":0.12,"transitionSeconds":0.64,"id":"thinking-resolve","family":"thinking","label":"Resolve","note":"Thought converges toward an answer."},"mischievous-left":{"reliefMode":"cheek_dimple","eyeOpenL":0.105,"eyeOpenR":0.205,"eyeTiltL":-6.2,"eyeTiltR":3.0,"eyeLiftL":0.45,"eyeLiftR":-0.25,"eyeWidthL":0.94,"eyeWidthR":1.03,"mouthWidth":0.59,"mouthOpen":0.11,"mouthCurve":0.31,"pullL":0.52,"pullR":-0.01,"mouthLift":0,"mouthSkew":-0.16,"mouthPinch":0,"mouthRound":0,"wide":0.12,"low":0,"asym":-0.34,"crown":0.05,"energy":0.88,"browL":0,"browR":0,"cheekL":0.54,"cheekR":0.07,"tension":0.43,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.12,"motionGain":0.72,"holdBias":0.5,"microSeed":10.2,"glowLag":0.12,"transitionSeconds":0.72,"id":"mischievous-left","family":"mischievous","label":"Left smirk","note":"Knowing asymmetry weighted to the left side."},"mischievous-right":{"reliefMode":"cheek_dimple","eyeOpenL":0.195,"eyeOpenR":0.105,"eyeTiltL":-3.0,"eyeTiltR":6.2,"eyeLiftL":-0.25,"eyeLiftR":0.45,"eyeWidthL":1.03,"eyeWidthR":0.94,"mouthWidth":0.59,"mouthOpen":0.11,"mouthCurve":0.31,"pullL":-0.01,"pullR":0.52,"mouthLift":0,"mouthSkew":0.16,"mouthPinch":0,"mouthRound":0,"wide":0.12,"low":0,"asym":0.34,"crown":0.05,"energy":0.88,"browL":0,"browR":0,"cheekL":0.07,"cheekR":0.54,"tension":0.43,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.12,"motionGain":0.72,"holdBias":0.5,"microSeed":11.4,"glowLag":0.12,"transitionSeconds":0.72,"id":"mischievous-right","family":"mischievous","label":"Right smirk","note":"Knowing asymmetry weighted to the right side."},"mischievous-spark":{"reliefMode":"goosebumps","eyeOpenL":0.48,"eyeOpenR":0.52,"eyeTiltL":-5.0,"eyeTiltR":2.2,"eyeLiftL":0.05,"eyeLiftR":-0.55,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.65,"mouthOpen":0.42,"mouthCurve":0.65,"pullL":0.06,"pullR":0.48,"mouthLift":0,"mouthSkew":0.11,"mouthPinch":0,"mouthRound":0,"wide":0.18,"low":0,"asym":0.28,"crown":0.12,"energy":1.02,"browL":0,"browR":0,"cheekL":0.18,"cheekR":0.48,"tension":0.48,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.32,"motionGain":0.82,"holdBias":0.5,"microSeed":12.7,"glowLag":0.12,"transitionSeconds":0.48,"id":"mischievous-spark","family":"mischievous","label":"Spark","note":"Brief high-energy cleverness without juvenile sweetness."},"pleased-contained":{"reliefMode":"cheek_dimple","eyeOpenL":0.5,"eyeOpenR":0.5,"eyeTiltL":-1.7,"eyeTiltR":1.7,"eyeLiftL":0.15,"eyeLiftR":0.15,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.62,"mouthOpen":0.28,"mouthCurve":0.48,"pullL":0.24,"pullR":0.26,"mouthLift":0.05,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0.2,"low":0,"asym":0,"crown":0,"energy":0.92,"browL":0,"browR":0,"cheekL":0.3,"cheekR":0.32,"tension":0.26,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.78,"motionGain":0.58,"holdBias":0.5,"microSeed":13.8,"glowLag":0.12,"transitionSeconds":0.72,"id":"pleased-contained","family":"pleased","label":"Contained","note":"Subtle satisfaction with restrained energy release."},"pleased-bright":{"reliefMode":"cheek_dimple","eyeOpenL":0.275,"eyeOpenR":0.275,"eyeTiltL":-1.7,"eyeTiltR":1.7,"eyeLiftL":-0.5,"eyeLiftR":-0.5,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.76,"mouthOpen":0.34,"mouthCurve":0.48,"pullL":0.32,"pullR":0.36,"mouthLift":0.08,"mouthSkew":0,"mouthPinch":0,"mouthRound":0.12,"wide":0.4,"low":0,"asym":0,"crown":0.04,"energy":1.08,"browL":0,"browR":0,"cheekL":0.46,"cheekR":0.5,"tension":0.34,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.02,"motionGain":0.76,"holdBias":0.5,"microSeed":14.9,"glowLag":0.12,"transitionSeconds":0.52,"id":"pleased-bright","family":"pleased","label":"Bright","note":"Clear completion response with open luminous face."},"pleased-warm":{"reliefMode":"cheek_dimple","eyeOpenL":0.235,"eyeOpenR":0.245,"eyeTiltL":-1.0,"eyeTiltR":1.0,"eyeLiftL":0,"eyeLiftR":0,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.68,"mouthOpen":0.23,"mouthCurve":0.43,"pullL":0.28,"pullR":0.3,"mouthLift":0.06,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0.28,"low":0,"asym":0,"crown":0,"energy":0.98,"browL":0,"browR":0,"cheekL":0.4,"cheekR":0.42,"tension":0.28,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.86,"motionGain":0.64,"holdBias":0.5,"microSeed":15.7,"glowLag":0.12,"transitionSeconds":0.72,"id":"pleased-warm","family":"pleased","label":"Warm","note":"Soft relational warmth after success."},"blocked-uncertain":{"reliefMode":"brow_knit","eyeOpenL":0.23,"eyeOpenR":0.185,"eyeTiltL":-0.2,"eyeTiltR":2.8,"eyeLiftL":-0.15,"eyeLiftR":0.45,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.38,"mouthOpen":0.055,"mouthCurve":-0.1,"pullL":0.02,"pullR":-0.02,"mouthLift":0,"mouthSkew":-0.08,"mouthPinch":0.28,"mouthRound":0,"wide":0,"low":0.18,"asym":-0.12,"crown":-0.03,"energy":0.66,"browL":0.1,"browR":-0.22,"cheekL":0,"cheekR":0,"tension":0.42,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.62,"motionGain":0.4,"holdBias":0.5,"microSeed":16.2,"glowLag":0.12,"transitionSeconds":0.44,"id":"blocked-uncertain","family":"blocked","label":"Uncertain","note":"Momentary ambiguity without collapse or panic."},"blocked-compressed":{"reliefMode":"effort_pinches","eyeOpenL":0.18,"eyeOpenR":0.18,"eyeTiltL":-2.8,"eyeTiltR":2.8,"eyeLiftL":0.75,"eyeLiftR":0.75,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.31,"mouthOpen":0.02,"mouthCurve":-0.5,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0.58,"mouthRound":0,"wide":-0.14,"low":0.42,"asym":0,"crown":-0.12,"energy":0.54,"browL":-0.28,"browR":-0.28,"cheekL":0,"cheekR":0,"tension":0.72,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":0.985,"postureScaleY":1.012,"bodyLean":0,"tempo":0.46,"motionGain":0.24,"holdBias":0.9,"microSeed":17.5,"glowLag":0.12,"transitionSeconds":0.4,"id":"blocked-compressed","family":"blocked","label":"Compressed","note":"A bounded failure state with inward shell pressure."},"blocked-retry":{"reliefMode":"brow_raise","eyeOpenL":0.22,"eyeOpenR":0.245,"eyeTiltL":-1.6,"eyeTiltR":0.8,"eyeLiftL":-0.2,"eyeLiftR":-0.45,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.41,"mouthOpen":0.085,"mouthCurve":0.01,"pullL":0.01,"pullR":0.06,"mouthLift":0,"mouthSkew":0.04,"mouthPinch":0.18,"mouthRound":0,"wide":0,"low":0,"asym":0,"crown":0.04,"energy":0.76,"browL":0.1,"browR":0.18,"cheekL":0,"cheekR":0,"tension":0.3,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.92,"motionGain":0.54,"holdBias":0.5,"microSeed":18.7,"glowLag":0.12,"transitionSeconds":0.62,"id":"blocked-retry","family":"blocked","label":"Retry","note":"Recovery begins while uncertainty remains visible."},"executing-drive":{"reliefMode":"goosebumps","eyeOpenL":0.3,"eyeOpenR":0.275,"eyeTiltL":-2.1,"eyeTiltR":0.6,"eyeLiftL":-0.7,"eyeLiftR":-0.35,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.42,"mouthOpen":0.045,"mouthCurve":0.01,"pullL":0.03,"pullR":0.03,"mouthLift":0,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0,"low":0,"asym":0.09,"crown":0.1,"energy":0.86,"browL":0.28,"browR":0.16,"cheekL":0,"cheekR":0,"tension":0.12,"focusX":-0.14,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":1.08,"motionGain":0.7,"holdBias":0.5,"microSeed":4.2,"glowLag":0.12,"transitionSeconds":0.56,"id":"executing-drive","family":"executing","label":"Executing Drive","note":"Goosebumps surface for executing-drive (D-0074)."},"pleased-resolve":{"reliefMode":"goosebumps_soft","eyeOpenL":0.5,"eyeOpenR":0.5,"eyeTiltL":-1.7,"eyeTiltR":1.7,"eyeLiftL":0.15,"eyeLiftR":0.15,"eyeWidthL":1,"eyeWidthR":1,"mouthWidth":0.62,"mouthOpen":0.28,"mouthCurve":0.48,"pullL":0.24,"pullR":0.26,"mouthLift":0.05,"mouthSkew":0,"mouthPinch":0,"mouthRound":0,"wide":0.2,"low":0,"asym":0,"crown":0,"energy":0.92,"browL":0,"browR":0,"cheekL":0.3,"cheekR":0.32,"tension":0.26,"focusX":0,"postureX":0,"postureY":0,"postureScaleX":1,"postureScaleY":1,"bodyLean":0,"tempo":0.78,"motionGain":0.58,"holdBias":0.5,"microSeed":13.8,"glowLag":0.12,"transitionSeconds":0.72,"id":"pleased-resolve","family":"pleased","label":"Pleased Resolve","note":"Goosebumps surface for pleased-resolve (D-0074)."}});
  const EMOTION_FAMILIES = Object.freeze({"neutral":["neutral-settled","neutral-social","neutral-wry"],"listening":["listening-orient","listening-hold","listening-receive"],"thinking":["thinking-scan","thinking-knit","thinking-resolve"],"mischievous":["mischievous-left","mischievous-right","mischievous-spark"],"pleased":["pleased-contained","pleased-bright","pleased-warm"],"blocked":["blocked-uncertain","blocked-compressed","blocked-retry"]});
  const FAMILY_LIGHT_INTENSITY = Object.freeze({neutral:1.00,listening:1.03,thinking:0.97,mischievous:1.05,pleased:1.08,blocked:0.92}); // D-0033 Q3: bounded per-family internal-light INTENSITY (no hue); neutral 1.00 baseline = byte-identical to prior; max |deviation| 0.08 -> field-opacity delta ~0.04 << maxPaletteDelta 0.32
  const SINGULARITY_FLARE = Object.freeze({gatherTau:1.4,recoverTau:3.2,chance:0.20,peakLo:0.30,peakHi:0.75,halfWindow:0.16,photon:0.18,hotCore:0.15,halo:0.22}); // D-0035 singularity deep-internal flare timing + per-node INTENSITY boosts (brief 5); intensity-only (no hue, 6a deferred); max per-node opacity delta 0.22 < maxPaletteDelta 0.32; reversible by zeroing the boosts
  const SINGULARITY_SETTLE = Object.freeze({gather:0.055,photon:0.08,tau:1.1,cross:0.98}); // D-0036 singularity entry compression-settle (brief 5 beat 1): one-shot breath-scale inward gather as the morph lands; gather=peak fractional radius contraction, photon=peak ring brighten, tau=ease-back (~one breath), cross=entry-completion threshold; intensity+radius only (no hue, 6a deferred); reversible by zeroing gather/photon
  const RECOGNITION_SPARK = Object.freeze({cross:0.5,lift:0.12,tau:0.9}); // D-0037 singularity exit recognition accent (brief 5 beat 3 + 3 exit): one-shot INTENSITY-only lift of the interior face-field light as the being leaves the seed, timed to the face re-emergence (the "noticing you" spark); cross=exit threshold (singularityWeight falling through ~0.5 = morphMix~0.52 = face re-emergence onset, :1285), lift=peak fractional interior-light boost, tau=ease-back (quicker spark than the D-0036 settle); intensity-only (no hue, 6a deferred); reversible by zeroing lift
  const GAZE_VIEWER_SETTLE = Object.freeze({cross:0.5,tau:1.2,dilation:0.6}); // D-0038 singularity exit gaze settle-on-viewer (brief 3 exit + packet 4 Q2 half): the GAZE half of the wake recognition accent, companion of the D-0037 light spark; one-shot settle of the composed gaze to dead center on the viewer + a bounded recognition aperture dilation as the being leaves the seed; cross=exit threshold (SAME falling edge as D-0037), tau=settle hold+release (slower linger-on-you than the 0.9s spark), dilation=fraction of gazeRecogAmp fired as the exit "aha"; gaze-orientation+aperture only (no hue, 6a deferred); reversible by zeroing dilation + removing the look multiply
  const DEPTH_GLOW = Object.freeze({enabled:true,amp:0.15,tau:0.22,ref:48}); // D-0040 V3 (A) depth-shaped interior light: e fold (:1417) *= (1+amp*depthGlow); depthGlow eases toward the mesh projectedDepth RANGE / ref (how much volume faces the viewer). amp 0.15 (brief 6b bounded +/-0.12-0.18), tau ~glowTau-scale lag, ref normalizes projectedDepth range. INTENSITY-ONLY (D-0033; no hue). yaw 0 => projectedDepth:0 shortcut (:906) => depthGlow 0 => identity (byte-identical). Reversible: enabled=false => e-fold ternary = 1.
  const FASCIA = Object.freeze({enabled:true,opacity:0.13,speckleOpacity:0.30,bands:3,perBand:9,radialInner:0.34,radialOuter:0.86,stagger:7,phase0:0.4,freq:1.0,size:2.1,visFloor:0.18}); // D-0040 V3 (B) resting fascia coherence: faint always-on APERIODIC surface read at neutral (relief LAYER opacity 0.13, brief 6a 0.10-0.16; well under event-driven 0.52/0.70). Three radial bands breathe at incommensurate slow rates (freq*(1+b*0.17), ~0.1 Hz base) on the real-time clock => alive even at settled, no master sine, no 2-level toggle (7.1/8.1; 5.3 alive band). Rides the relief LAYER opacity only; publishes NO rim (C4-05 neutral->zero-rim intact). Reversible: enabled=false => neutral branch's opacity '0' (byte-identical).
  const FORM_EXPANSION = Object.freeze({enabled:true,amp:0.025,tau:0.4,lightAmp:0.06}); // D-0040 V3 (C) whole-form expansion: sampleBodyForProfile (:878) uniformly scales body radii about center by (1+amp*formExpansion). amp 0.025 => max +/-2% radius (~1.2px << 8px no-pinch), tau eases on family change (DET-002 retarget, no pop). Body contour only; face plane untouched. Reversible: enabled=false => _expK = 1.
  const FORM_EXPANSION_FAMILY = Object.freeze({neutral:0,listening:0.4,thinking:-0.3,mischievous:0.5,pleased:0.8,blocked:-0.7}); // D-0040 V3 (C) per-family whole-form expansion targets in [-1,1] — DIRECTIONAL PRIORS (shape-emotion memo §3: pleased expansion up / blocked contraction down / listening slight up / thinking slight in / mischievous up; neutral 0 => identity). Authored hypothesis keyed off the authored family, NOT diagnostic, NOT observer-label-as-truth (AFF-BARRETT-2019).
  const FORM_TENSION = Object.freeze({enabled:true,amp:0.018,tau:0.4,stiffen:0.5,lightAmp:0.06,fasciaAmp:0.6}); // D-0041 V3 Layer A whole-form TENSION channel (brief §5 Layer A + §7#2; memo §2 formTension=whole-form rigidity MEDIUM/PROVISIONAL). Couples coherently to (i) contour: _tenK contraction amp 0.018 => max -1.8% radius (~0.9px << 8px no-pinch) + _tenStiff damps the autonomous drift micro (rigid-but-smooth containment, modulates an EXISTING aperiodic signal so 7.1-safe); (ii) interior light: lightAmp 0.06 => tension->slightly contained/dimmer (INTENSITY-ONLY D-0033); (iii) surface: fasciaAmp 0.6 => tension->slightly more fascia definition (capped << event-driven 0.52/0.70). tau 0.4 eases on family change (DET-002 retarget, no pop). Reversible: enabled=false => _tenK=_tenStiff=1, light/fascia terms 1.
  const FORM_TENSION_FAMILY = Object.freeze({neutral:0,listening:0.25,thinking:0.5,mischievous:0.35,pleased:0.1,blocked:0.85}); // D-0041 V3 Layer A per-family whole-form tension targets in [0,1] — DIRECTIONAL PRIORS (shape-emotion memo §3: neutral low / listening low-mid / thinking mid / mischievous low-mid alert / pleased low (soft-open) / blocked high rigid-but-smooth). Authored hypothesis keyed off the authored family, NOT diagnostic, NOT observer-label-as-truth (AFF-BARRETT-2019). Sibling of FORM_EXPANSION_FAMILY.
  const RECOGNITION_POP = Object.freeze({enabled:true,lift:0.5,tau:0.55}); // D-0041 V3 Layer A recognition MASS-pop (brief §5 Layer A: recognition -> brief expansion pop then settle): one-shot whole-form swell riding the SAME recognitionCross falling-edge as the D-0037 light spark + D-0038 gaze settle, so the WHOLE MASS says "aha" (not just the eyes). lift adds to formExpansion in _expK (=> +1.25% radius at peak, << 8px), tau 0.55 = brief pop then settle (a touch snappier than the 0.9 light spark). The light spike itself is the existing recognitionSpark (no double-dip). Reversible: enabled=false => pop contribution 0.
  // D-0049 EIGHT-STATE PHYSICAL CHARACTER (doctrine D-0048 §3): per-state body stance recipes keyed by the live
  // eight-state id (forwarded each flush by GasperRigController.setEightState). Each recipe is an ADDITIVE accent over
  // the family/fixture layer: crown (top-of-head bulge/flatten, SAME units as the fixture crown -> r+=crown*1.6*top),
  // expansion (whole-form swell/contract, [-1,1] like FORM_EXPANSION_FAMILY), tension (rigid-but-smooth containment,
  // ~[0,1] like FORM_TENSION_FAMILY), light (interior-light INTENSITY delta, [-1,1], NO HUE per D-0033), low/wide
  // (lower-body fullness / width, same units as the fixture low/wide), beat (transient crown pulse on entry, M3).
  // Slice 1 fills the three most opposed states + neutral zero; listening/recognition/executing/dormant fall back to
  // neutral (zero) until Slices 2/3. enabled=false (or the runtime eightStateBodyEnabled toggle) => targets 0 => identity.
  const EIGHT_STATE_BODY = Object.freeze({enabled:true,tau:0.5,gestureSec:0.9,lightAmp:0.18,recipe:Object.freeze({
    'presence-neutral-settled':Object.freeze({crown:0,expansion:0,tension:0,light:0,low:0,wide:0,beat:0}),
    'presence-thinking-knit':Object.freeze({crown:0.35,expansion:-0.35,tension:0.30,light:-0.6,low:0,wide:-0.08,beat:0.06,breath:Object.freeze({ch:'crown',amp:0.04,hz:0.3}),three:Object.freeze({gather:0.85,peak:0.50,settle:0.70,hold:1.0,over:0.04})}), // D-0053+D-0054: held crown bulge + contained narrow + dimmer; D-0054 breath = slow crown knit-pulse (the crown "breathes" as if knitting thought; aperiodic 2-term, 7.1-safe, frozen under reduced motion)
    'presence-blocked-strain':Object.freeze({crown:-0.18,expansion:-0.45,tension:0.55,light:-0.9,low:0.35,wide:-0.18,beat:0,breath:Object.freeze({ch:'tension',amp:0.12,hz:0.9}),three:Object.freeze({gather:0.30,peak:0.40,settle:0.90,hold:1.0,over:0.22})}), // D-0053+D-0054: visible braced clamp; D-0054 breath = tense tremor (high-freq low-amp pulse on tension = the rigid containment trembles slightly)
    'presence-pleased-resolve':Object.freeze({crown:0.14,expansion:0.55,tension:-0.10,light:1.0,low:-0.06,wide:0.25,beat:0.10,breath:Object.freeze({ch:'wide',amp:0.06,hz:0.25}),three:Object.freeze({gather:0.55,peak:0.75,settle:0.65,hold:1.0,over:0.16})}), // D-0053+D-0054: visible bloom; D-0054 breath = gentle bloom-breath (slow expansion pulse = the mass slowly swells/relaxes)
    'presence-listening-receive':Object.freeze({crown:0.12,expansion:0.20,tension:0.12,light:0.35,low:0.08,wide:0.10,beat:0.04,breath:Object.freeze({ch:'wide',amp:0.04,hz:0.2}),three:Object.freeze({gather:0.35,peak:0.40,settle:0.40,hold:1.0,over:0.07})}), // D-0053+D-0054: visible lean-in; D-0054 breath = open-to-receive breath (gentle expansion pulse = the body gently opens/closes as if attending)
    'presence-recognition-spark':Object.freeze({crown:0.30,expansion:0.45,tension:0.05,light:1.0,low:-0.08,wide:0.14,beat:0.16,breath:Object.freeze({ch:'crown',amp:0.06,hz:0.5}),three:Object.freeze({gather:0.22,peak:0.45,settle:0.40,hold:1.0,over:0.30})}), // D-0053+D-0054: visible lifted+brighter hold; D-0054 breath = bright flicker (interior light pulses as if the "aha" is still resonating; intensity-only, D-0033-safe)
    'comet-executing-drive':Object.freeze({crown:-0.02,expansion:0.18,tension:0.25,light:0.70,low:-0.04,wide:0.06,beat:0.12,three:Object.freeze({gather:0.50,peak:0.70,settle:0.45,hold:0.85,over:0.20})}), // D-0051 Slice 3: executing = driven flight (wide-stretched driving mass + energy-high interior + forward tuck + the only state with low<0 = in-flight, M7 flight axis) composing over the comet FORM_PROFILE + D-0046 momentum + D-0047 wake/gaze-lead the loop transport already drives; M4 3-beat phrasing (gather launch -> peak drive pulse w/ overshoot -> settle to 0.85 sustained hold) authored from loop-manifest transition ratios (entry 0.85 / exit 0.42) scaled to the renderer gesture timescale
    'dormant-orbit-maintain':Object.freeze({crown:0,expansion:-0.30,tension:-0.15,light:-0.60,low:0.18,wide:-0.08,beat:0,three:Object.freeze({gather:1.10,peak:0.80,settle:0.90,hold:0.90,over:0.06})}), // D-0051 Slice 3: dormant = faceless gravitational seed (crown 0 = no head per constitution; mass compressed; tension -slack = resting NOT bracing, the discriminator from tense Blocked; light -low; low +grounded; wide drawn-in) on the dormant-orbit gyre form (face stays governed by the singularity path, 11.6); M4 = a slow sustained orbit (slowest gather 1.10, minimal overshoot 0.06, strongly sustained 0.90 hold), no impulsive crown beat (beat 0) // D-0050 Slice 2: listening = mild lean-in/open (small crown + slight swell + low attentive tension + a touch brighter; clearly smaller than pleased's full bloom and positive-tension vs pleased's soft-negative) ; recognition = impulsive "aha" (crown peak above thinking, open not braced, brightest interior surge, strong entry beat) composing over the D-0041 mass-pop + D-0037 light spark which fire transiently on the singularity-exit cross (no double-dip on the steady loop hold where recognitionSpark=0)
  })});
  const EIGHT_STATE_MOUTH = Object.freeze({enabled:true,delta:Object.freeze({'presence-neutral-settled':Object.freeze({curve:0,open:0,skew:0,pullR:0,pullL:0}),'presence-listening-receive':Object.freeze({curve:0.06,open:0.10,skew:0,pullR:0.04,pullL:0.04}),'presence-thinking-knit':Object.freeze({curve:-0.04,open:-0.04,skew:0.08,pullR:0.02,pullL:0.06}),'presence-recognition-spark':Object.freeze({curve:0.20,open:0.36,skew:0,pullR:0.10,pullL:0.10}),'comet-executing-drive':Object.freeze({curve:0.02,open:0.02,skew:0,pullR:0.12,pullL:0.12}),'presence-blocked-strain':Object.freeze({curve:-0.24,open:-0.03,skew:-0.06,pullR:0.12,pullL:0.08}),'presence-pleased-resolve':Object.freeze({curve:0.42,open:0.08,skew:0,pullR:0.16,pullL:0.16}),'dormant-orbit-maintain':Object.freeze({curve:-0.02,open:-0.04,skew:0,pullR:0,pullL:0})})}); // D-0059 V4 MOUTH GRAMMAR kill-switch + per-state mouth-delta table on the FIVE existing levers (mouthCurve/mouthOpen/mouthSkew/pullR/pullL — NO anatomy, NO new geometry, face-geometry-immutable: recipe DATA composed at the fixture layer, the guarded face block is untouched => FACE_GEOMETRY_SHA unchanged). Each state's mouth agrees with its body stance (neutral resting / listening soft-parted / thinking pressed-cocked / recognition open-aha / executing set-drive / blocked pursed-tense / pleased warm-smile / dormant slack). Eased with the body's 3-beat _esMix envelope (holistic agreement) in the render loop; applied additively in composeFixtureMotion upstream of the autonomous micro + no-pinch clamp. enabled=false OR live-coeff mouth.mouthGain=0 => contribution exactly zero => byte-identical to prior (reversible). Shipped gain 1 (the being expresses; the user's strong-recognition-and-expression mandate); the witness captures gain 1 (grammar) + gain 0 (baseline) to prove reversibility. Shape-only no hue (D-0033); bounded by the no-pinch clamp; reduced-motion-safe (held shape persists via _esMix=1 at motionStrength 0, autonomous micro freezes).
  const AMORPH_WANDER = Object.freeze({enabled:true,amp:Object.freeze({asym:0.14,lean:0.5,wide:0.05,low:0.04})}); // D-0057 PILLAR 4 smallest slice: slow bounded aperiodic shape-discovery wander per-channel amplitudes (fixture units). asym/lean drive the visible lateral exploration + tilt and are NOT M7 axes (wander freely); wide/low kept small to protect ratified M7 static legibility. enabled=false or live-coeff wander.wanderAmp=0 => identity (reversible). Frozen under reduced motion + settled rest gate (gated on motionStrength in composeFixtureMotion). 8.1 incommensurate / 7.1 aperiodic / 5.3 C-inf / 8.2 arrestable; shape-only no hue (D-0033)
  const EIGHT_STATE_POP = Object.freeze({enabled:true,crownK:0.9,expK:0.6,amp:Object.freeze({'presence-neutral-settled':0,'presence-listening-receive':0.08,'presence-thinking-knit':0.20,'presence-recognition-spark':0.30,'comet-executing-drive':0.14,'presence-blocked-strain':-0.16,'presence-pleased-resolve':0.18,'dormant-orbit-maintain':0.04})}); // D-0061 per-state TEMPORAL ENTRY-POP (the user's 'strong recognition and expression' mandate + the thinking-bulge exemplar; realizes the D-0056 honest finding that the tau-eased 3-beat overshoot was attenuated to ~0). A per-state ANALYTIC half-sine pulse confined to the recipe.three peak phase, recomputed each frame from stateGestureAge => BYPASSES the channel tau low-pass and reads at full authored amplitude; injected DIRECTLY post-tau into the crown bulge (:917, crownK) + whole-form expansion (:933, expK), mirroring the recognitionPop one-shot pattern. +amp = outward crown-bulge + mass-swell on entry (recognition 0.30 brightest 'aha' / thinking 0.20 the crown-bulge the user loved / pleased 0.18 warm bloom / executing 0.14 drive / listening 0.08 soft lean-in / dormant 0.04 slow settle); -amp = inward brace (blocked -0.16 = a sharp clench); neutral 0 (calm baseline, no recipe.three => no pop). Separate const + own per-state table (mirrors D-0059 EIGHT_STATE_MOUTH); recipe DATA, the guarded face block is untouched => FACE_GEOMETRY_SHA unchanged. enabled=false OR live-coeff pop.popGain=0 => statePop exactly 0 => byte-identical (reversible); shipped gain 1. Gated on motionStrength => frozen under reduced motion (the held posture persists via the tau-eased _esMix channels; the pop is motion). Shape-only radius, no anatomy, no hue (D-0033); transient + smooth gauss-weighted => no-pinch-safe (comparable to thinking's ratified sustained crown:0.35). M7-safe: decays to 0 once stateGestureAge >= gather+peak => absent from the static settled sheet.
  const SPATIAL_DEPTH_LIGHT = Object.freeze({enabled:true,K:2.5,floorFrac:0.45,ceilFrac:1.6,shadeSign:-0.5}); // D-0060 PILLAR 1 spatial per-lobe depth-light gradient (the deferred V3 §6f/§7#3 'near lobe glows, far recedes' = the ghost-in-the-machine 3D interior; the SCALAR whole-interior depth-light is DEPTH_GLOW, this is its SPATIAL sibling on the per-lobe body/aura light nodes). Per-frame fold (after the e compute at :1573 / field opacities at :1576) on the 8 lobe light nodes: lobeDepthSign = (parallax lobe scale)-1 = nearLobeScale-1 (right group) / farLobeScale-1 (left group) => +near/-far/0 at yaw 0, sign flips with yaw sign automatically; interiorFactor = clamp(e,0,1) so a dark/dormant being shows no grade; term = spatialGain*interiorFactor*lobeDepthSign*K*nodeSignMult (glint/aura/volume nodeSignMult +1 = near brightens/far recedes; shade nodeSignMult -0.5 = near shade lightens/far shade deepens => a coherent advance/recede); opacity = clamp(base*(1+term), base*floorFrac, min(base*ceilFrac,1)) where base = the node's authored opacity captured once at first render. K 2.5 => at yaw 45 (amount 1) near glint term +0.225 (saturates toward a bright near-glow, ceil-clamped <=1) / far glint term -0.40 (recedes to base*0.6); at yaw 22.5 half; at yaw 0 zero. enabled=false OR live-coeff depthLight.spatialGain=0 => term 0 => each node = authored base => value+pixel-identical (reversible); shipped gain 1. INTENSITY-ONLY opacity of existing gradient nodes (NO hue D-0033; NO new element; NO geometry; NO silhouette touch => zero pinch); lobe nodes + this write are OUTSIDE the guarded face block => FACE_GEOMETRY_SHA unchanged by construction; reduced-motion-safe (function of yaw+interior energy, not motionStrength => a turned being stays graded under reduced motion; on the living loop the seal pins ~8° => a small constant grade, recorded not overclaimed).
  const EIGHT_STATE_MOMENTUM = Object.freeze({enabled:true,amp:Object.freeze({'presence-neutral-settled':Object.freeze({stiff:1,damp:1,gain:1,lean:1,tau:1}),'presence-listening-receive':Object.freeze({stiff:0.90,damp:0.95,gain:1.10,lean:1.05,tau:0.90}),'presence-thinking-knit':Object.freeze({stiff:0.70,damp:1.25,gain:0.85,lean:1.15,tau:1.50}),'presence-recognition-spark':Object.freeze({stiff:1.60,damp:0.70,gain:1.35,lean:1.25,tau:0.60}),'comet-executing-drive':Object.freeze({stiff:1.30,damp:0.85,gain:1.50,lean:1.40,tau:0.80}),'presence-blocked-strain':Object.freeze({stiff:0.60,damp:1.70,gain:0.70,lean:0.60,tau:1.30}),'presence-pleased-resolve':Object.freeze({stiff:0.85,damp:0.80,gain:1.05,lean:1.10,tau:1.10}),'dormant-orbit-maintain':Object.freeze({stiff:0.50,damp:2.00,gain:0.40,lean:0.40,tau:2.00})})}); // D-0062 per-state MOMENTUM/INERTIA signature on the D-0046 CoM spring-damper (PILLAR 3): each state rides the SAME ratified rig but with its own mass/feel — recognition a quick dart (stiff 1.6 / damp 0.7 / gain 1.35 = light + snappy), blocked a heavy arrest (stiff 0.6 / damp 1.7 / gain 0.7 = sluggish + clamped), executing a driven lean (gain 1.5 / lean 1.4 = directional commitment), thinking a slow tilt (tau 1.5 / damp 1.25 = deliberate lag), listening a light forward ease (gain 1.10 / stiff 0.9), pleased a soft settle (stiff 0.85 / damp 0.8 / tau 1.1), dormant a near-frozen drift (stiff 0.5 / damp 2.0 / gain 0.4 / tau 2.0), neutral the calm baseline (all 1). Multipliers modulate kX/kY (stiff), cLow/cHigh (damp), centroidGain (gain), leanGain (lean), targetTau (tau); eased with the body's _esE tau in the render body-block => the inertia signature transitions smoothly on state change (a HELD property of the stance, like the posture, NOT gesture-gated). Separate const + own per-state table (mirrors D-0059 EIGHT_STATE_MOUTH / D-0061 EIGHT_STATE_POP); recipe DATA + param modulation only, the guarded face block is untouched => FACE_GEOMETRY_SHA unchanged. enabled=false OR live-coeff momentum.stateGain=0 => every multiplier eases to 1 => the rig is byte-identical to prior (reversible); shipped gain 1. Bounded by the rig's maxOffset/maxLean clamps => zero pinch; reduced-motion-safe (the rig integration stays motionStrength-gated :1593 — the multipliers only scale params, they add no motion; under reduced motion the rig eases home regardless). Shape/motion-only, no hue (D-0033), no anatomy.
  const EIGHT_STATE_FORM_VARIANT = Object.freeze({enabled:true,pinch:2.0,variant:Object.freeze({'presence-neutral-settled':Object.freeze({crown:0,low:0,wide:0,asym:0}),'presence-listening-receive':Object.freeze({crown:0.30,low:0,wide:0,asym:0.55}),'presence-thinking-knit':Object.freeze({crown:0.90,low:0,wide:-0.35,asym:0}),'presence-recognition-spark':Object.freeze({crown:0.80,low:-0.20,wide:0,asym:0.45}),'comet-executing-drive':Object.freeze({crown:0,low:0,wide:0,asym:0}),'presence-blocked-strain':Object.freeze({crown:-0.7,low:0.8,wide:-0.6,asym:0}),'presence-pleased-resolve':Object.freeze({crown:0.5,low:0.7,wide:0.8,asym:0}),'dormant-orbit-maintain':Object.freeze({crown:0,low:0,wide:0,asym:0})})}); // D-0066 SLICE A per-state FORM-VARIANT silhouette layer — closes the honest FROZEN pearl-to-pearl gestalt gap named in CONCEPT_OF_PERFECT §2/§4/§6 (the six presence-pearl states read as one smooth family on a frozen still; discrimination lived only in motion/mouth/light/crown). A per-state ADDITIVE radius layer composed on the EXISTING per-vertex weight basis (crown=>top, low=>lower, wide=>sideR+sideL — the same basis as the D-0049 line-924 state deltas) inside sampleBodyForProfile, keyed off the already-piped live eightStateId (M1 pipe reused; NO new cross-boundary wire). Slice A varies ONLY the evidenced closest round-blob pair — blocked (flat top crown:-0.7 / heavy base low:+0.8 / drawn-in narrow wide:-0.6 = a compressed brace) and pleased (lifted crown:+0.5 / fuller low:+0.7 / rounder wider wide:+0.8 = a plump bloom), the shape-opposite pair by design; SLICE B adds the remaining three pearl variants per the D-0066 brief §2 feature-ownership table — listening (gentle one-sided lean-in: crown +0.30 / asym +0.55, the subtlest, owns A=directionality), thinking (tall symmetric egg: crown +0.90 / wide -0.35, owns C-with-dome), recognition (lifted off-center alert peak: crown +0.80 / low -0.20 / asym +0.45, owns S=peak + A) — via the new fvAsym asymmetric channel ((sideR-sideL) weight basis). Neutral stays the all-zero reference (D-0048 §3); executing keeps comet + dormant keeps gyre, already unmistakable frozen). Eased on the body tau (_esE) with the 3-beat _esMix envelope exactly like stateCrown (holistic agreement; smooth state-change morph, no snap §7.2/§8.4) => a HELD shape property that PERSISTS under reduced motion + on a frozen still (the regime the gap lives in; unlike breath/wander/pop which freeze out). Doctrine locks: topology 512/360/672/1000 untouched (per-vertex radius modulation only, no renumber, D-0031); face block eyePath..renderExpressionShell untouched => FACE_GEOMETRY_SHA b6d944d… unchanged by construction (the variant writes radius upstream of the face anchors + the bumps sit at crown/base/sides, geometrically clear of the face plane; D-0026); INTENSITY-only, NO hue, NO new light source (pure radius term; D-0033); relief-ellipses / GASPER-009 rim-highlight machinery untouched (D-0032 firm-retain); no-resurrection (does NOT restore D-0027/D-0028 optics). No-pinch: each vertex's variant delta is HARD-CLAMPED to +/-pinch (2.0, comparable to the existing composed _formK worst case ~3.3% radius and well under the ~8px ceiling) so the contour cannot self-intersect regardless of tuning (same idiom as the D-0059 V4 mouth no-pinch clamp); separability comes from many small orthogonal weight-basis terms, not one big push. Reversible: enabled=false OR live-coeff formVariant.formVariantGain=0 => the composition is skipped => BYTE-IDENTICAL to prior (shipped gain 1; the witness captures gain 1 + gain 0 to prove the fallback + make the delta visible). M7-safe: adds shape separability without eroding the ratified recipe-scalar separation (non-regression checked in the witness).
  const MOTION_LIGHT = Object.freeze({enabled:true,amp:0.25,refSpeed:8}); // D-0063 MOMENTUM-COUPLED INTERIOR LIGHT — the holistic tie-in of motion (D-0046/D-0062) into light (D-0055/D-0060): the being's inner glow ANSWERS its own motion. A bounded factor folded into the interior-light energy e (:1578) proportional to the momentum speed = hypot(momentumVX,momentumVY) (the persistent module lets at :273; last-frame speed, a smooth one-frame lag): factor = 1 + amp*min(1,speed/refSpeed)*gate. amp 0.25 => up to +25% interior brightness at full momentum speed (a hard morph shot peaks ~speed 8 => saturates; calm hold speed ~0 => identity); refSpeed 8 normalizes against the living speed range (D-0062 trace peaked 8.7). So the ghost in the machine GLOWS as it exerts/morphs and SETTLES as it rests — the inner light is a function of the inner motion, not a separate layer. INTENSITY-ONLY (scales e which drives the violet/cyan/face field opacities :1581 + the D-0060 spatial grade; NO hue D-0033; NO new element; bounded by the existing field clamps violet[.06,.66]/cyan[.10,.80]/face[.16,.90] => zero pinch). enabled=false OR live-coeff motionLight.motionLightGain=0 => factor exactly 1 => e unchanged => byte-identical (reversible); shipped gain 1. Reduced-motion-safe + 7.1-safe: driven by ACTUAL momentum speed (not a perpetual throb); under reduced motion the rig eases home => speed->0 => factor->1 (the glow fades out over the rig's ~0.4s home ease, smooth not a slam); at rest factor=1. The e-fold + this const + the telemetry are OUTSIDE the guarded face block => FACE_GEOMETRY_SHA unchanged by construction.
  const LIGHT_RIG = Object.freeze({enabled:true,tau:0.12,hop:1.15,gmax:3.0,p1:6,p2:18,wrap:0.35,aSheen:0.6}); // TSS-0 TRUE SHADER SYSTEM (D-0044 Pillar 1 interim SVG light rig): purely-vector light field computed from production geometry each frame. Dome = 360-node articulation mesh with exact liftSurfacePoint z (lift^0.58); analytic gradients only; view-space FIXED lights (key/fill/rim); dark-pearl material (diffuse wrap w=0.35, sheen pow 6, glint pow 18, rim fresnel); EMA tau 0.12s; argmax glint + hop hysteresis x1.15. enabled=false OR live-coeff lightRig.lightRigGain=0 => no visual writes + no smoothing state => byte-identical. INTENSITY-ONLY (opacity/gradient-focal writes on existing nodes; NO hue D-0033; NO geometry/silhouette touch; NO face-block edits). Reversible by construction.
  const _lrN3=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];};
  const LightRig=(()=>{
    const LIGHTS={key:{dir:_lrN3([-0.55,-0.65,0.52]),I:1.00},fill:{dir:_lrN3([0.60,0.35,0.55]),I:0.35},rim:{dir:_lrN3([0.10,-0.75,-0.60]),I:0.45}};
    const KEYS=Object.keys(LIGHTS);
    const M=360,STRIDE=8,NS=512/STRIDE;
    const inten=new Float32Array(M),gscore=new Float32Array(M),rimI=new Float32Array(NS);
    const sm={glint:null,sheen:null,score:0};
    let glintIndex=null;
    function evalFrame(f,dt){
      const mesh=f.mesh,profile=f.profile,th=f.yaw*Math.PI/180,sinY=Math.sin(th),cosY=Math.cos(th);
      const frame=formProjectionFrame(profile),ds=profileDepthScale(profile);
      let gi=0;
      for(let i=0;i<M;i++){
        const m=mesh[i];
        const ox=m.sourceX-frame.cx,oy=m.sourceY-frame.cy,nx=ox/frame.rx,ny=oy/frame.ry;
        const ic=Math.max(Math.max(0,1-nx*nx-ny*ny),0.02);
        const slope=ds*0.58*Math.pow(ic,-0.42);
        let dzx=-sinY+cosY*slope*(-2*nx/frame.rx);
        let dzy=cosY*slope*(-2*ny/frame.ry);
        const gm=Math.hypot(dzx,dzy);
        if(gm>LIGHT_RIG.gmax){dzx*=LIGHT_RIG.gmax/gm;dzy*=LIGHT_RIG.gmax/gm;}
        const nl=Math.hypot(dzx,dzy,1),n0=-dzx/nl,n1=-dzy/nl,n2=1/nl;
        let d=0,s1=0,s2=0;
        for(let k=0;k<3;k++){
          const L=LIGHTS[KEYS[k]],dir=L.dir;
          const ndl=n0*dir[0]+n1*dir[1]+n2*dir[2];
          d+=L.I*Math.max(0,(ndl+LIGHT_RIG.wrap)/(1+LIGHT_RIG.wrap));
          const rv=Math.max(0,2*ndl*n2-dir[2]);
          s1+=L.I*Math.pow(rv,LIGHT_RIG.p1);
          s2+=L.I*Math.pow(rv,LIGHT_RIG.p2);
        }
        inten[i]=d;gscore[i]=s2;
        if(s2>gscore[gi])gi=i;
      }
      if(glintIndex!==null&&gscore[gi]<gscore[glintIndex]*LIGHT_RIG.hop)gi=glintIndex;
      glintIndex=gi;
      const gp=mesh[gi];
      let sheenX=0,sheenY=0,sheenW=0;
      for(let i=0;i<M;i++){
        const w=Math.pow(gscore[i],LIGHT_RIG.p1/LIGHT_RIG.p2);
        sheenX+=mesh[i].x*w;sheenY+=mesh[i].y*w;sheenW+=w;
      }
      if(sheenW>0){sheenX/=sheenW;sheenY/=sheenW;}
      let rimAcc=0;for(let i=0;i<NS;i++){const p=f.pts[i*STRIDE],n=f.normals[i*STRIDE];const nx=n.x,ny=n.y;const nl=Math.hypot(nx,ny,1)||1;const n2=1/nl;let r=0;for(let k=0;k<3;k++){const L=LIGHTS[KEYS[k]],dir=L.dir;const ndl=nx*dir[0]+ny*dir[1]+n2*dir[2];r+=L.I*Math.max(0,2*ndl*n2-dir[2]);}rimI[i]=r;rimAcc+=r;}
      const a=1-Math.exp(-dt/LIGHT_RIG.tau);
      const gl={x:gp.x,y:gp.y},sh={x:sheenX,y:sheenY},sc=gscore[gi];
      if(!sm.glint){sm.glint={...gl};sm.sheen={...sh};sm.score=sc;}else{sm.glint.x+=(gl.x-sm.glint.x)*a;sm.glint.y+=(gl.y-sm.glint.y)*a;sm.sheen.x+=(sh.x-sm.sheen.x)*a;sm.sheen.y+=(sh.y-sm.sheen.y)*a;sm.score+=(sc-sm.score)*a;}
      return{glint:{...sm.glint},sheen:{...sm.sheen},score:sm.score,rimI,inten,gscore,rimAvg:rimAcc/NS,glintIndex};
    }
    function reset(){sm.glint=null;sm.sheen=null;sm.score=0;glintIndex=null;}
    return{evalFrame,reset};
  })();
  let lastLightRigInput=null;
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
    'dormant-orbit':Object.freeze({label:'Dormant Orbit: Quiet Gyre',note:'Gasper held in stable low-energy self-maintenance: residual gravity well, traveling spectral energy, disciplined asymmetry',sx:1,sy:1,cx:0,cy:1,face:false,faceY:0,faceScaleX:1,faceScaleY:1,horizon:.34,disc:0,lensed:0,geometryModel:'dormant-family',dormantCollapse:.10,dormantSpin:1}), // D-0077: disc 1.00 -> 0 (remove the awkward partially-visible accretion ring around the dormant state)
    'wispwalker':Object.freeze({label:'Wispwalker',note:'Load-bearing foot roots emerge continuously from redistributed lower-shell mass',sx:.93,sy:1.16,cx:0,cy:2,face:true,faceY:-1,faceScaleX:.97,faceScaleY:.97,horizon:.22,disc:0,frontAppendage:'rooted-feet',tailPolicy:'none'}),
    'comet':Object.freeze({label:'Comet Familiar',note:'Protected forward cranial dome flowing through a continuous shoulder into a tapered wake',sx:1,sy:1,cx:0,cy:0,face:true,faceX:18,faceY:-1,faceScaleX:.92,faceScaleY:.94,eyeWidthScale:1.08,eyeOpenScale:1.08,horizon:.42,disc:0,geometryModel:'forward-mass-attached-wake'}),
    'halo':Object.freeze({label:'Halo Crown',note:'Orbital intellect and event-horizon emphasis',sx:1.045,sy:.955,cx:0,cy:1,face:true,faceY:1,faceScaleX:1.01,faceScaleY:.96,horizon:.92,disc:0}),
    'lantern':Object.freeze({label:'Lantern Geist',note:'Tall, curious, and magically buoyant',sx:.900,sy:1.105,cx:0,cy:-1,face:true,faceY:-5,faceScaleX:.92,faceScaleY:.98,horizon:.30,disc:0}),
    'low-orbit':Object.freeze({label:'Low Orbit',note:'Ground-settled viscoelastic puddle with smooth side continuity and an intimate social face plane',sx:1,sy:1,cx:0,cy:0,face:true,faceY:11.5,faceScaleX:.88,faceScaleY:.74,eyeWidthScale:1.1,eyeOpenScale:1.2,mouthYShift:-6.5,mouthScale:1.14,mouthOpenScale:1.28,horizon:.34,disc:0,frontAppendage:'none',tailPolicy:'none',geometryModel:'ground-tangent-puddle'}), // D-0077: eyeWidthScale 1.32->1.1, eyeOpenScale 1.48->1.2 (eyes no longer oversized for the flattened body, no top-edge clip)
  });
  // Canonical Wispwalker identity is a resting-form contract, not a gait output.
  // Motion/contact/COM may articulate this hull later in posed-point space, but
  // they may never rewrite the profile radius itself or change what embodiment
  // "wispwalker" means while the organism is moving.
  const WISPWALKER_CANONICAL_CONTOUR=Object.freeze({
    crownAmp:-5,
    crownTheta:-Math.PI/2,
    crownSigma:.52,
    lowerBowlTrimAmp:1.4,
    lowerBowlTrimTheta:Math.PI/2,
    lowerBowlTrimSigma:.62,
    chinAmp:-5,
    chinTheta:Math.PI/2,
    chinSigma:.40,
    lobeAmp:3.2,
    leftLobeTheta:1.31,
    rightLobeTheta:1.83,
    lobeSigma:.15,
    rootAmp:2.2,
    leftRootTheta:1.19,
    rightRootTheta:1.95,
    rootSigma:.26,
    cleftDepth:3.2,
    cleftTheta:Math.PI/2,
    cleftSigma:.14,
  });
  if(!globalThis.__GASPER_LIVE_COEFFS__)globalThis.__GASPER_LIVE_COEFFS__={};
  if(!globalThis.__GASPER_LIVE_COEFFS__.wispwalker){
    globalThis.__GASPER_LIVE_COEFFS__.wispwalker={
      crownAmp:WISPWALKER_CANONICAL_CONTOUR.crownAmp,
      chinAmp:WISPWALKER_CANONICAL_CONTOUR.chinAmp,
      lobeAmp:WISPWALKER_CANONICAL_CONTOUR.lobeAmp,
      cleftDepth:WISPWALKER_CANONICAL_CONTOUR.cleftDepth,
      footAmp:4,armAmp:0,walkAmp:.5,walkPeriod:1.25,walkAccent:.6,stepDepth:4,walkEnable:1
    };
  }
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
  // GASPER-MAT-001/002: persistent named material identities in material space (clock=VEC-401).
  // Anchors are authored material-space records (not mesh-index remainder). MAT-002 projects them.
  const VECTOR_MATERIAL_FEATURES = Object.freeze({
    clock: 'VEC-401',
    coordinateSpace: 'material',
    cosmicFlecks: Object.freeze([
      Object.freeze({ id: 'fleck-01', u: 0, radial: 0.42, depth: -0.28, phase: 0, frequency: 0.11 }),
      Object.freeze({ id: 'fleck-02', u: 0.61803399, radial: 0.515, depth: -0.19, phase: 1.731, frequency: 0.127 }),
      Object.freeze({ id: 'fleck-03', u: 0.23606798, radial: 0.61, depth: -0.1, phase: 3.462, frequency: 0.144 }),
      Object.freeze({ id: 'fleck-04', u: 0.85410197, radial: 0.705, depth: -0.01, phase: 5.193, frequency: 0.161 }),
      Object.freeze({ id: 'fleck-05', u: 0.47213596, radial: 0.8, depth: 0.08, phase: 6.924, frequency: 0.178 }),
      Object.freeze({ id: 'fleck-06', u: 0.09016994, radial: 0.42, depth: 0.17, phase: 8.655, frequency: 0.11 }),
      Object.freeze({ id: 'fleck-07', u: 0.70820393, radial: 0.515, depth: 0.26, phase: 10.386, frequency: 0.127 }),
      Object.freeze({ id: 'fleck-08', u: 0.32623792, radial: 0.61, depth: -0.28, phase: 12.117, frequency: 0.144 }),
      Object.freeze({ id: 'fleck-09', u: 0.94427191, radial: 0.705, depth: -0.19, phase: 13.848, frequency: 0.161 }),
      Object.freeze({ id: 'fleck-10', u: 0.5623059, radial: 0.8, depth: -0.1, phase: 15.579, frequency: 0.178 }),
      Object.freeze({ id: 'fleck-11', u: 0.18033989, radial: 0.42, depth: -0.01, phase: 17.31, frequency: 0.11 }),
      Object.freeze({ id: 'fleck-12', u: 0.79837388, radial: 0.515, depth: 0.08, phase: 19.041, frequency: 0.127 }),
      Object.freeze({ id: 'fleck-13', u: 0.41640787, radial: 0.61, depth: 0.17, phase: 20.772, frequency: 0.144 }),
      Object.freeze({ id: 'fleck-14', u: 0.03444185, radial: 0.705, depth: 0.26, phase: 22.503, frequency: 0.161 }),
      Object.freeze({ id: 'fleck-15', u: 0.65247584, radial: 0.8, depth: -0.28, phase: 24.234, frequency: 0.178 }),
      Object.freeze({ id: 'fleck-16', u: 0.27050983, radial: 0.42, depth: -0.19, phase: 25.965, frequency: 0.11 }),
      Object.freeze({ id: 'fleck-17', u: 0.88854382, radial: 0.515, depth: -0.1, phase: 27.696, frequency: 0.127 }),
      Object.freeze({ id: 'fleck-18', u: 0.50657781, radial: 0.61, depth: -0.01, phase: 29.427, frequency: 0.144 }),
      Object.freeze({ id: 'fleck-19', u: 0.1246118, radial: 0.705, depth: 0.08, phase: 31.158, frequency: 0.161 }),
      Object.freeze({ id: 'fleck-20', u: 0.74264579, radial: 0.8, depth: 0.17, phase: 32.889, frequency: 0.178 }),
      Object.freeze({ id: 'fleck-21', u: 0.36067978, radial: 0.42, depth: 0.26, phase: 34.62, frequency: 0.11 }),
      Object.freeze({ id: 'fleck-22', u: 0.97871376, radial: 0.515, depth: -0.28, phase: 36.351, frequency: 0.127 }),
      Object.freeze({ id: 'fleck-23', u: 0.59674775, radial: 0.61, depth: -0.19, phase: 38.082, frequency: 0.144 }),
      Object.freeze({ id: 'fleck-24', u: 0.21478174, radial: 0.705, depth: -0.1, phase: 39.813, frequency: 0.161 }),
    ]),
    cosmicStreaks: Object.freeze([
      Object.freeze({ id: 'cosmic-streak-01', u: 0.14, radial: 0.58, depth: -0.12, phase: 0.40, frequency: 0.09 }),
      Object.freeze({ id: 'cosmic-streak-02', u: 0.37, radial: 0.66, depth: -0.08, phase: 1.55, frequency: 0.11 }),
      Object.freeze({ id: 'cosmic-streak-03', u: 0.61, radial: 0.52, depth: -0.16, phase: 2.70, frequency: 0.08 }),
      Object.freeze({ id: 'cosmic-streak-04', u: 0.84, radial: 0.71, depth: -0.05, phase: 3.95, frequency: 0.10 }),
    ]),
    subsurfaceBands: Object.freeze([
      Object.freeze({ id: 'subsurface-band-01', u: 0.22, radial: 0.38, depth: -0.24, phase: 0.20, frequency: 0.05 }),
      Object.freeze({ id: 'subsurface-band-02', u: 0.50, radial: 0.46, depth: -0.18, phase: 1.10, frequency: 0.06 }),
      Object.freeze({ id: 'subsurface-band-03', u: 0.78, radial: 0.34, depth: -0.28, phase: 2.05, frequency: 0.05 }),
    ]),
    hardHighlights: Object.freeze([
      Object.freeze({ id: 'highlight-nub-left', u: 0.72, radial: 0.68, depth: 0.12, phase: 0.0, frequency: 0.0 }),
      Object.freeze({ id: 'highlight-nub-right', u: 0.28, radial: 0.68, depth: 0.12, phase: 0.0, frequency: 0.0 }),
      Object.freeze({ id: 'highlight-face-left', u: 0.58, radial: 0.48, depth: 0.18, phase: 0.0, frequency: 0.0 }),
    ]),
  });
  // GASPER-MAT-003: authored 6.5 palette roles plus bounded response ranges.
  // These values preserve vivid color/depth without allowing a uniform wash or
  // a hard-light/subsurface hierarchy collapse during runtime modulation.
  const MATERIAL_CALIBRATION = Object.freeze({
    id: 'gasper-6.5-vivid-depth-v1',
    response: Object.freeze({
      fleckOpacityMin: 0.32,
      fleckOpacityCap: 0.85,
      streakOpacityMin: 0.10,
      streakOpacityCap: 0.55,
      subsurfaceOpacityMin: 0.05,
      subsurfaceOpacityCap: 0.18,
      hardHighlightOpacityFloor: 0.42,
      hardHighlightOpacityCap: 1.0,
      opticalDepthOpacityCap: 0.52,
    }),
  });

  const body = $('body'), avatar = $('avatar'), stage = $('stage'), clipBody = $('clipBody'), ground = $('ground'), contactShadow = $('contactShadow'), idleRig = $('idleRig'), chromaticShell = $('chromaticShell'), worldRig = $('worldRig'), stepRig = $('stepRig'), groundOuter = $('groundOuter'), contactShadowOuter = $('contactShadowOuter'), contactShadowCore = $('contactShadowCore'); // GASPER-SPACE-001 PHASE A: worldRig wraps groundContactLayer + idleRig (one transform carries body + shadow through space); the extra shadow ellipses get altitude attenuation. CYCLE 5 S2: stepRig wraps the contour shell (the step's bottom-weighted skew never touches the face grammar — D-0118)
  chromaticShell.setAttribute('clip-path','url(#bodyClip)'); // D-0042 ring fix: clip the static round shell group to the frame-synced body contour (same url(#bodyClip) the lobe/face/flow layers already use). chromaticShell geometry is never re-projected (only opacity is), so on non-round silhouettes (comet/lemon/low-orbit) its round members overflowed the body = the floating ring; bodyClip 'd' is rewritten every frame to closedSpline(pts) (:1355) so the clip tracks the projected/morphed contour at all yaws; on round embodiments the clip is a visual no-op. Additive + reversible (remove attr => prior); face-safe; topology-safe.
  const cyanFieldNode = $('cyanFieldNode');
  const crownVolumePath = $('crownVolumePath'), apexGlowNode = $('apexGlowNode'); // D-0068 (F2) volumetric crown fill nodes (full-contour, energy-tracked)
  const tssGlintNode = $('tssGlintNode'), tssSheenNode = $('tssSheenNode'); // TSS-0 true shader glint/sheen nodes (geometry-driven focal positions)
  const shellChromaticPath = $('shellChromaticPath'), innerVolumePath = $('innerVolumePath'), pearlCorePath = $('pearlCorePath'), violetCorePath = $('violetCorePath'), crownBloomPath = $('crownBloomPath'), cyanReservoirPath = $('cyanReservoirPath'), cosmicCloudPath = $('cosmicCloudPath'), cosmicCellA = $('cosmicCellA'), cosmicCellB = $('cosmicCellB'), cosmicCellC = $('cosmicCellC'), cosmicCellD = $('cosmicCellD'), cosmicFlecks = $('cosmicFlecks');
  // GASPER-MAT-001 node-cache: persistent material identity nodes (projection later).
  // Persistent flecks resolve under materialFlecksLayer — NOT under legacy cosmicFlecks
  // (renderCosmicFlecks still calls cosmicFlecks.replaceChildren and must not destroy identities).
  // Fleck/streak/band nodes are named SVG ids; hard highlights bind to existing hard white ribbon nodes.
  const materialFlecksLayer = $('materialFlecksLayer');
  const opticalDepth = $('opticalDepth');
  const materialFleckNodes = Object.freeze(Object.fromEntries(VECTOR_MATERIAL_FEATURES.cosmicFlecks.map((f) => [f.id, $(f.id)])));
  const materialStreakNodes = Object.freeze(Object.fromEntries(VECTOR_MATERIAL_FEATURES.cosmicStreaks.map((s) => [s.id, $(s.id)])));
  const materialBandNodes = Object.freeze(Object.fromEntries(VECTOR_MATERIAL_FEATURES.subsurfaceBands.map((b) => [b.id, $(b.id)])));
  // VEC-302: pure vector materials — image-space filter and blend compositing removed.
  const reliefLayer = $('reliefLayer'), reliefHighlight = $('reliefHighlight'), reliefShadow = $('reliefShadow'), reliefHighlightSoft = $('reliefHighlightSoft'), reliefShadowSoft = $('reliefShadowSoft'), reliefFeatureLayer = $('reliefFeatureLayer'), reliefFeatureHighlight = $('reliefFeatureHighlight'), reliefFeatureShadow = $('reliefFeatureShadow'), reliefFeatureHighlightSoft = $('reliefFeatureHighlightSoft'), reliefFeatureShadowSoft = $('reliefFeatureShadowSoft'), keyReflectionLayer = $('keyReflectionLayer'), secondaryReflectionLayer = $('secondaryReflectionLayer'), lobeGlintsLayer = $('lobeGlintsLayer');
  const keyFacetA = $('keyFacetA'), keyFacetB = $('keyFacetB'), keyFacetC = $('keyFacetC'), keyFacetD = $('keyFacetD'), keyCore = $('keyCore'), fillHalo = $('fillHalo'), fillBand = $('fillBand'), secondaryCore = $('secondaryCore'), leftLobeShade = $('leftLobeShade'), rightLobeShade = $('rightLobeShade'), leftLobeVolume = $('leftLobeVolume'), rightLobeVolume = $('rightLobeVolume'), leftLobeGlint = $('leftLobeGlint'), rightLobeGlint = $('rightLobeGlint'), leftLobeGlintHalo = $('leftLobeGlintHalo'), rightLobeGlintHalo = $('rightLobeGlintHalo'), leftLobeAura = $('leftLobeAura'), rightLobeAura = $('rightLobeAura'), leftLobeAuraOuter = $('leftLobeAuraOuter'), rightLobeAuraOuter = $('rightLobeAuraOuter'), containedLobeMaterial = $('containedLobeMaterial'), exteriorAuraLayer = $('exteriorAuraLayer'), rim = $('rim'), rightRim = $('rightRim'), bounce = $('bounce'), rimOuter = $('rimOuter'), rightRimOuter = $('rightRimOuter'), bounceOuter = $('bounceOuter');
  // Hard highlights: existing hard white ribbon content is the named material identity source (not a new visual language).
  const materialHardHighlightNodes = Object.freeze({
    'highlight-nub-left': leftLobeGlint,
    'highlight-nub-right': rightLobeGlint,
    'highlight-face-left': keyCore,
  });
  // GASPER-MAT-004: the packaged realm supplies one pure material-space field
  // evaluator. Its state is local to this mounted FormMaster instance, so
  // identity survives morph/profile changes without cross-mount leakage.
  let vectorMaterialRuntimeState=null;
  // GASPER-MAT-004 / D-0060 reconciliation: per-lobe view-depth gain computed
  // by the spatial depth-light fold, consumed by the material highlight commit
  // so the commit is the ONE final write for the two glint highlight nodes.
  let depthLightGlintGain={left:1,right:1};
  opticalDepth?.style.setProperty('opacity', String(MATERIAL_CALIBRATION.response.opticalDepthOpacityCap), 'important');
  const eyeL = $('eyeL'), eyeR = $('eyeR'), mouth = $('mouth'), eyeLHalo = $('eyeLHalo'), eyeRHalo = $('eyeRHalo'), mouthHalo = $('mouthHalo'), faceRecessLayer = $('faceRecessLayer'), faceEmissionLayer = $('faceEmissionLayer');
  const expressionShellLayer=$('expressionShellLayer'),expressionOcclusionLayer=$('expressionOcclusionLayer'),browTensionL=$('browTensionL'),browTensionR=$('browTensionR'),cheekTensionL=$('cheekTensionL'),cheekTensionR=$('cheekTensionR'),mouthTension=$('mouthTension'),browTensionLOuter=$('browTensionLOuter'),browTensionROuter=$('browTensionROuter'),cheekTensionLOuter=$('cheekTensionLOuter'),cheekTensionROuter=$('cheekTensionROuter'),mouthTensionOuter=$('mouthTensionOuter'),eyeTroughL=$('eyeTroughL'),eyeTroughR=$('eyeTroughR'),mouthTrough=$('mouthTrough'),eyeTroughLOuter=$('eyeTroughLOuter'),eyeTroughROuter=$('eyeTroughROuter'),mouthTroughOuter=$('mouthTroughOuter');
  const accretionDiscBack = $('accretionDiscBack'), accretionDiscBackGlow = $('accretionDiscBackGlow'), accretionDiscFront = $('accretionDiscFront'), accretionDiscHotCore = $('accretionDiscHotCore');
  const accretionRearLens = $('accretionRearLens'), accretionRearLensGlow = $('accretionRearLensGlow'), accretionRearLensOuter = $('accretionRearLensOuter'), accretionRearLensInner = $('accretionRearLensInner'), accretionNearPlane = $('accretionNearPlane'), accretionNearPlaneGlow = $('accretionNearPlaneGlow'), accretionNearPlaneBand = $('accretionNearPlaneBand'), accretionNearPlaneHot = $('accretionNearPlaneHot'), accretionLowerLens = $('accretionLowerLens'), photonRingInner = $('photonRingInner'), eventHorizonCore = $('eventHorizonCore');

  const eyeLShadow = $('eyeLShadow'), eyeRShadow = $('eyeRShadow'), mouthShadow = $('mouthShadow');
  const eyeLShadowOuter = $('eyeLShadowOuter'), eyeRShadowOuter = $('eyeRShadowOuter'), mouthShadowOuter = $('mouthShadowOuter');
  const eyeLBloom = $('eyeLBloom'), eyeRBloom = $('eyeRBloom'), mouthBloom = $('mouthBloom');
  const eyeLBloomOuter = $('eyeLBloomOuter'), eyeRBloomOuter = $('eyeRBloomOuter'), mouthBloomOuter = $('mouthBloomOuter');
  const eyeLRecess = $('eyeLRecess'), eyeRRecess = $('eyeRRecess'), mouthRecess = $('mouthRecess');
  const eyeLRecessOuter = $('eyeLRecessOuter'), eyeRRecessOuter = $('eyeRRecessOuter'), mouthRecessOuter = $('mouthRecessOuter');
  const debug = $('debug'), debugEdges = $('debugEdges'), debugPoints = $('debugPoints'), faceAnchorDebug = $('faceAnchorDebug');

  const coupling = $('coupling'), motion = $('motion'), interiorEnergy = $('interiorEnergy'), yaw = $('yaw');
  const fixedIdlePhaseRaw = query.get('idlePhase');
  const fixedIdlePhase = fixedIdlePhaseRaw===null?null:Math.max(0,Math.min(1,Number(fixedIdlePhaseRaw)||0));
  const reducedMotionQuery = query.get('reduced')==='1';
  const reducedMotionMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = reducedMotionQuery || reducedMotionMedia.matches;
  const proofMode = query.get('proof')==='1';
  let proofFramePending = false;
  // VEC-401: one structural clock port. The packaged desktop installs the
  // typed host clock before this script executes. A local driver exists only for
  // the true standalone HTML path.
  const ORGANISM_CLOCK_METHODS=['installGlobal','start','stop','pause','resume','setMode','getMode','setSeed','getSeed','setFixedStepMs','getFixedStepMs','scrub','setFixedTime','setDeterministicTime','step','nowMs','elapsed','getDeltaMs','getSignedDeltaMs','getFrameIndex','getLastFrame','isRunning','isPaused','subscribe','unsubscribe','hasSubscriber','inspect','reset','clearFault'];
  function isOrganismClockPort(value){return !!value&&typeof value==='object'&&value.version==='1'&&value.packet==='VEC-401'&&typeof value.authorityId==='string'&&ORGANISM_CLOCK_METHODS.every(name=>typeof value[name]==='function');}
  function createStandaloneOrganismClock(){
    let mode='realtime',running=false,clockPaused=true,timeMs=0,elapsedMs=0,deltaMs=0,signedDeltaMs=0,frameIndex=0,seed=654,fixedStepMs=1000/60,maxDeltaMs=50,lastWall=null,raf=null,lastFrame=null,fault=null,dispatching=false;
    const subs=new Map();
    const nowWall=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
    const direction=value=>value>0?1:value<0?-1:0;
    const ordered=()=>[...subs.values()].sort((a,b)=>a.priority-b.priority||(a.id<b.id?-1:a.id>b.id?1:0));
    function stopDriver(){if(raf==null)return;if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(raf);else clearTimeout(raf);raf=null;}
    function dispatch(){if(dispatching)throw new Error('Gasper organism clock reentrant dispatch refused');dispatching=true;frameIndex+=1;const frame=Object.freeze({timeMs,elapsedMs,deltaMs,signedDeltaMs,deltaSec:signedDeltaMs/1000,direction:direction(signedDeltaMs),frameIndex,seed,mode,paused:clockPaused,running});lastFrame=frame;try{for(const sub of ordered()){try{sub.onFrame(frame);}catch(error){fault=Object.freeze({subscriberId:sub.id,frameIndex,message:error instanceof Error?error.message:String(error)});console.error('[FormMaster standalone clock] subscriber fault',error);}}}finally{dispatching=false;}return frame;}
    function ensureDriver(){if(raf!=null||!running||clockPaused||mode!=='realtime')return;const loop=wall=>{raf=null;if(!running||clockPaused||mode!=='realtime')return;let signed=0;if(lastWall==null)lastWall=wall;else{signed=Math.max(0,Math.min(maxDeltaMs,wall-lastWall));lastWall=wall;timeMs+=signed;elapsedMs+=signed;}signedDeltaMs=signed;deltaMs=Math.abs(signed);dispatch();if(running&&!clockPaused&&mode==='realtime')raf=typeof requestAnimationFrame==='function'?requestAnimationFrame(loop):setTimeout(()=>loop(nowWall()),16);};raf=typeof requestAnimationFrame==='function'?requestAnimationFrame(loop):setTimeout(()=>loop(nowWall()),16);}
    const clock={version:'1',packet:'VEC-401',authorityId:'formmaster-standalone',
      installGlobal(){const existing=globalThis.__GASPER_ORGANISM_CLOCK__;if(existing&&existing!==clock)throw new Error('Gasper organism clock split-brain refused');globalThis.__GASPER_ORGANISM_CLOCK__=clock;return clock;},
      start(options){if(options?.mode)clock.setMode(options.mode);running=true;if(mode==='realtime'){clockPaused=false;ensureDriver();}else{clockPaused=true;stopDriver();}return clock;},
      stop(){running=false;clockPaused=true;stopDriver();lastWall=null;return clock;},
      pause(){clockPaused=true;stopDriver();lastWall=null;return clock;},
      resume(){mode='realtime';running=true;clockPaused=false;lastWall=null;ensureDriver();return clock;},
      setMode(next){mode=next;lastWall=null;if(next==='realtime'){if(running&&!clockPaused)ensureDriver();}else{clockPaused=true;stopDriver();}return clock;},getMode(){return mode;},
      setSeed(value){seed=(Number(value)||0)>>>0;return clock;},getSeed(){return seed;},setFixedStepMs(value){fixedStepMs=Math.max(1,Number(value)||fixedStepMs);return clock;},getFixedStepMs(){return fixedStepMs;},
      scrub(value){if(dispatching)throw new Error('Gasper organism clock reentrant dispatch refused');const target=Math.max(0,Number(value)||0),signed=target-timeMs;mode='deterministic';clockPaused=true;stopDriver();lastWall=null;timeMs=target;elapsedMs+=Math.abs(signed);signedDeltaMs=signed;deltaMs=Math.abs(signed);return dispatch();},setFixedTime(value){return clock.scrub(value);},setDeterministicTime(value){return clock.scrub(value);},
      step(value){if(dispatching)throw new Error('Gasper organism clock reentrant dispatch refused');const d=Math.max(0,Math.min(maxDeltaMs,Number.isFinite(value)?Number(value):fixedStepMs));if(mode==='realtime')mode='fixed-step';clockPaused=true;stopDriver();lastWall=null;timeMs+=d;elapsedMs+=d;signedDeltaMs=d;deltaMs=d;return dispatch();},
      nowMs(){return timeMs;},elapsed(){return elapsedMs;},getDeltaMs(){return deltaMs;},getSignedDeltaMs(){return signedDeltaMs;},getFrameIndex(){return frameIndex;},getLastFrame(){return lastFrame;},isRunning(){return running;},isPaused(){return clockPaused;},
      subscribe(sub){if(!sub?.id||typeof sub.onFrame!=='function')throw new TypeError('organism clock subscriber');const id=String(sub.id).trim();subs.set(id,{id,priority:Number.isFinite(sub.priority)?sub.priority:100,onFrame:sub.onFrame});let active=true;return()=>{if(!active)return;active=false;subs.delete(id);};},unsubscribe(id){return subs.delete(id);},hasSubscriber(id){return subs.has(id);},
      inspect(){return Object.freeze({version:'1',packet:'VEC-401',authorityId:'formmaster-standalone',mode,running,paused:clockPaused,timeMs,elapsedMs,deltaMs,signedDeltaMs,direction:direction(signedDeltaMs),frameIndex,seed,fixedStepMs,maxDeltaMs,subscriberIds:ordered().map(sub=>sub.id),subscriberCount:subs.size,driverScheduled:raf!=null,dispatching,fault,lastFrame,solePerpetualDriver:true});},
      reset(options={}){stopDriver();if(options.seed!==undefined)seed=(Number(options.seed)||0)>>>0;timeMs=Math.max(0,Number(options.timeMs)||0);elapsedMs=0;deltaMs=0;signedDeltaMs=0;frameIndex=0;lastFrame=null;lastWall=null;fault=null;mode='deterministic';clockPaused=true;running=false;return clock;},clearFault(){fault=null;return clock;}
    };
    return clock;
  }
  function acquireOrganismClock(){const existing=globalThis.__GASPER_ORGANISM_CLOCK__;if(existing!==undefined){if(!isOrganismClockPort(existing))throw new Error('Incompatible global Gasper organism clock');return existing;}const fallback=createStandaloneOrganismClock();fallback.installGlobal();return fallback;}
  const organismClock=acquireOrganismClock();
  const formMasterStandalone=organismClock.authorityId==='formmaster-standalone';
  let formMasterClockUnsub=null;
  const formMasterClockReleases=new Set();
  function organismNow(){return organismClock.nowMs();}
  function subscribeFormMasterClock(sub){const rawRelease=organismClock.subscribe(sub);let active=true;const release=()=>{if(!active)return;active=false;formMasterClockReleases.delete(release);rawRelease();};formMasterClockReleases.add(release);return release;}
  function ensureFormMasterClockSubscription(){if(formMasterClockUnsub)return;formMasterClockUnsub=subscribeFormMasterClock({id:'formmaster-render',priority:90,onFrame:function(frame){lastTime=frame.timeMs;elapsed=frame.elapsedMs/1000;render(frame.timeMs);}});}
  function disposeFormMasterClockSubscription(){if(formMasterClockUnsub){const release=formMasterClockUnsub;formMasterClockUnsub=null;release();}for(const release of [...formMasterClockReleases])release();}
  function requestFormMasterFrame(){const globalClock=globalThis.__GASPER_ORGANISM_CLOCK__;const activeClock=globalClock&&typeof globalClock.inspect==='function'?globalClock:organismClock;const inspection=activeClock.inspect?.();if(inspection?.dispatching)return activeClock.getLastFrame?.()??null;if(activeClock.getMode?.()==='realtime'&&activeClock.isRunning?.()&&!activeClock.isPaused?.())return activeClock.getLastFrame?.()??null;render(activeClock.nowMs?.()??organismNow(),0);return activeClock.getLastFrame?.()??null;}
  function requestRuntimeFrame(){if(!proofMode||proofFramePending)return;proofFramePending=true;requestFormMasterFrame();}
  document.documentElement.dataset.motionMode = reducedMotion?'static':'native-idle';
  document.documentElement.dataset.runtimeLoop = proofMode?'on-demand-proof':'organism-clock';
  document.documentElement.dataset.organismClock = 'VEC-401';
  const requestedEmotion=EMOTION_FAMILIES[query.get('emotion')]?query.get('emotion'):'neutral';
  const requestedFixture=EMOTION_FIXTURES[query.get('fixture')]?query.get('fixture'):EMOTION_FAMILIES[requestedEmotion][0];
  let state = requestedFixture;
  let emotionFamily = EMOTION_FIXTURES[state].family;
  let fixtureIndex = EMOTION_FAMILIES[emotionFamily]?.indexOf(state) ?? 0;
  let transitionFromFixture = state;
  let transitionToFixture = state;
  let transitionStartedAt = organismNow();
  let transitionDuration = EMOTION_FIXTURES[state].transitionSeconds;
  let transitionSerial = 0;
  let interruptionCount = 0;
  let emotionDemoMode = query.get('emotionDemo')==='1';
  let emotionDemoIndex = Math.max(0,EMOTION_DEMO_SEQUENCE.indexOf(state));
  let emotionDemoClock = 0;
  let runtimeDormant = false;
  let preDormantProfile = 'presence';
  let silhouetteProfile = FORM_PROFILES[query.get('geometry')]?query.get('geometry'):'wispwalker';
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
  const frameMetrics = {frames:0,scriptMs:[],topologyMs:[],normalMs:[],reliefMs:[],reliefEvaluationMs:[],reliefNormalMs:[],svgMs:[],frameIntervalMs:[],lightRigMs:[],longTasks:0,droppedFrames:0,lastFrameAt:0};
  if('PerformanceObserver' in globalThis){try{new PerformanceObserver(list=>{frameMetrics.longTasks+=list.getEntries().length;}).observe({entryTypes:['longtask']});}catch{}}
  function clampYaw(value){return Math.max(AUTHORED_YAW_RANGE[0],Math.min(AUTHORED_YAW_RANGE[1],Number(value)||0));}
  let viewYawDegrees = clampYaw(query.get('yaw')==null?8:query.get('yaw'));
  yaw.value=String(viewYawDegrees);
  let current = {...EMOTION_FIXTURES[state],wide:-1};
  let target = {...EMOTION_FIXTURES[state],wide:-1};
  let preDormantFixture = state;
  let preDormantFamily = emotionFamily;
  let activeMicrostate = null;
  let activeFixtureBlend = null;
  let behaviorMorphSerial = 0;
  let gasperMorphSerial = 0;
  let conversationSerial = 0;
  let laggedEnergy = current.energy;
  let familyLight = 1; // D-0033 Q3: lagged per-family internal-light intensity multiplier (sibling to laggedEnergy; eased with the same glowTau => 7.3-lagged layer-6, never per-frame). Seeded 1 = neutral baseline.
  let singularityFlare = 0; // D-0035: eased deep-internal flare envelope in [0,1] (sibling to laggedEnergy/familyLight); sparse + aperiodic + 7.3-lagged; seeded 0 = no flare at rest (quiet state byte-identical to D-0034)
  let singularitySettle = 0, prevSingWeight = 0; // D-0036: eased one-shot entry compression-settle envelope in [0,1] (seeded 0 = no gather at rest; held seed byte-identical to D-0034/D-0035) + rising-edge detector state (previous singularityWeight)
  let recognitionSpark = 0; // D-0037: eased one-shot exit recognition envelope in [0,1] (seeded 0 = no lift at rest; held presence byte-identical to prior); FALLING-edge triggered (mirror of singularitySettle's rising edge); reuses prevSingWeight
  let gazeViewerSettle = 0; // D-0038: eased one-shot exit gaze settle-on-viewer envelope in [0,1] (seeded 0 = no settle at rest; held presence gaze byte-identical to the living aperiodic system, the (1-0)=1 look multiply being identity); FALLING-edge triggered (SAME recognitionCross as the D-0037 spark); reuses prevSingWeight
  let depthGlow = 0; // D-0040 V3 (A): eased depth-shaped interior-light envelope in [0,1] (seeded 0 = yaw-0/flat-front identity; byte-identical to prior at yaw 0 where projectedDepth:0)
  let formExpansion = 0; // D-0040 V3 (C): eased whole-form expansion in [-1,1] (seeded 0 = neutral-family identity; byte-identical to prior at the neutral family)
  let formTension = 0; // D-0041 V3 Layer A: eased whole-form tension in [0,1] (seeded 0 = neutral-family identity; byte-identical to prior at the neutral family)
  let recognitionPop = 0; // D-0041 V3 Layer A: eased one-shot recognition MASS-pop envelope in [0,1] (seeded 0 = no pop at rest); FALLING-edge triggered (SAME recognitionCross as the D-0037 light spark + D-0038 gaze settle); reuses prevSingWeight
  let eightStateId='presence-neutral-settled'; // D-0049 M1: active eight-state recipe key (forwarded by GasperRigController each flush); seeded neutral = identity
  let eightStateBodyEnabled=EIGHT_STATE_BODY.enabled; // D-0049: runtime kill-switch; false => all state deltas ease to 0 => byte-identical fallback
  let stateCrown=0,stateExpansion=0,stateTension=0,stateLight=0,stateLow=0,stateWide=0,stateBeat=0; // D-0049 M2/M3: eased per-state body deltas + entry beat; seeded 0 = identity
  let stateMouthCurve=0,stateMouthOpen=0,stateMouthSkew=0,stateMouthPullR=0,stateMouthPullL=0; // D-0059 V4: eased per-state mouth deltas on the five existing levers; seeded 0 = identity (byte-identical to prior until the EIGHT_STATE_MOUTH delta table + render-loop easing drive them)
  let statePop=0; // D-0061: per-state temporal entry-pop envelope (analytic half-sine, recomputed each frame from stateGestureAge => NOT tau-eased => reads at full authored amplitude); seeded 0 = identity
  let stateMomStiff=1,stateMomDamp=1,stateMomGain=1,stateMomLean=1,stateMomTau=1;
  let fvCrown=0,fvLow=0,fvWide=0,fvAsym=0,fvMaxAbs=0; // D-0066 SLICE A: eased per-state form-variant radius features on the per-vertex weight basis (fvCrown=>top, fvLow=>lower, fvWide=>sideR+sideL), composed additively in sampleBodyForProfile; fvMaxAbs = measured per-call max |variant radius delta| (the no-pinch check, <= EIGHT_STATE_FORM_VARIANT.pinch). Seeded 0 = identity (byte-identical to prior until the EIGHT_STATE_FORM_VARIANT table + body-block _esE easing drive them). // D-0062: eased per-state momentum/inertia multipliers on the D-0046 spring-damper (stiff->kX/kY, damp->cLow/cHigh, gain->centroidGain, lean->leanGain, tau->targetTau); seeded 1 = identity (byte-identical to prior until the EIGHT_STATE_MOMENTUM amp table + body-block _esE easing drive them)
  let spatialBaseCaptured=false; let spatialBase={}; // D-0060: lazy-captured authored base opacity per lobe light node (read once from the SVG on first render; the spatial fold writes base*(1+term) so at term 0 each node == its authored base = value/pixel-identical to the authored front identity)
  let stateGestureAge=0; // D-0049a M3: entry-gesture AGE integrated on dt (advances even while paused, unlike elapsed which is gated on !paused :1288); seeded 0
  // D-0046 PILLAR 3 momentum/inertia rig (aliveness brief design/2026-07-27-aliveness-architecture-brief.md §1;
  // smallest reversible slice). A 2D nonlinear-drag spring-damper on the body's center-of-mass offset. The
  // target is the contour's first-moment centroid shift from its seeded neutral, so a morph into a front-heavy
  // form (comet) moves the mass forward and the body "shoots" with carried momentum (underdamped overshoot),
  // then settles; reversing the morph reverses the shot (the spring is symmetric). This is the literal "inertia
  // really applied through physics / strict and elegant mathematics / what organic looks like in code" the user
  // asked for. FROZEN under reduced motion (motionStrength=0 => offset eases home, no perpetual drift, 7.1).
  // ARRESTABLE (an interrupt retargets from the current offset/velocity, no teleport). FACE-SAFE: applied only
  // to the idleRig body-group transform (:1475), OUTSIDE the face geometry block; the whole being translates +
  // leans together (physically correct), the face CONFIGURATION is untouched. ADDITIVE + REVERSIBLE:
  // MOMENTUM_RIG.enabled=false => offset 0 => byte-identical to prior.
  const MOMENTUM_RIG = Object.freeze({enabled:true,kX:10.8,kY:5.8,cLow:1.8,cHigh:0.6,centroidGain:0.85,maxOffset:34,maxLean:7.0,leanGain:0.16,targetTau:0.30,gazeLeadGain:0.25,gazeLeadMax:2.0}); // N37 (2026-08-06): +20% viscous damping (cLow 1.5->1.8, cHigh 0.5->0.6 — the owner's settle-viscosity law: the post-arrest "bubbling" ringdown drops ~20%, ζ ~0.23->~0.28; the natural bounciness DURING motion is untouched — owner: "his overall bounciness is pretty natural"). // D-0078 / N36 / Wave 3: velocity-wake contour deformation is fully retired; the CoM spring-damper, lean, and gaze lead remain. // D-0046: kX/kY incommensurate (periods ~1.9s / ~2.6s => never repeats, 7.1/8.1); underdamped (zeta~0.23) => ballistic launch overshoot + organic settle; cLow linear floor + cHigh quadratic drag (fast launch, capped peak, smooth settle); centroidGain maps contour centroid shift -> target offset; maxOffset hard clamp (bounded, never leaves the stage); maxLean/leanGain bounded velocity-proportional tip into the motion; targetTau low-passes the target so a morph eases it rather than stepping it.
  let momentumX=0, momentumY=0, momentumVX=0, momentumVY=0; // D-0046: CoM offset (SVG user units) + velocity; seeded 0 = at-rest identity
  let momentumSeedCX=null, momentumSeedCY=null, momentumTargetX=0, momentumTargetY=0, momentumLastT=0; // D-0046: seeded neutral centroid (first living frame defines it) + low-passed target + last integration timestamp
  // GASPER-SPACE-001 PHASE A — 2.5D world-stage pose authority (the "next branch": Gasper moves through a
  // desktop-sized space). World units: 1920x1080 desktop extent; 1 content px = 8 world units. The target is
  // set ONLY through the provenance-tagged SidekickFormMasterRig.setWorldPose intake (scene/physics/capture
  // authorities; unprovenanced => home, fail-closed — the D-0088 fence idiom applied to space).
  // GASPER-CRAFT-002 · S2 · D-0099 MONITOR DOCTRINE — the DEPTH LAW (mirror of space/WorldSpace.ts,
  // verified like the FACE_ENERGY_SHAPE mirror): z is a signed world-unit distance from the home
  // plane (− = toward the monitor glass). scale(z) = homeViewDistance/(homeViewDistance+z) — a real
  // pinhole projection: size AND floor position obey the same factor (the floor anchor lifts by
  // floorToHorizonPx·(1−scale), so feet stay planted on the receding ground; near = low + big, far =
  // high + small; z→far converges on the horizon). KEYS ARE TRUTH (Doctrine 3a,
  // phi-beta-motion-perception): any provenance in flight draws EXACTLY — zero renderer smoothing.
  // The ONLY easing left is the home-return policy transition (provenance none => releaseTau;
  // motionStrength 0 => the reduced-motion fold, constitution 7.1). Application split: worldRig
  // carries projected travel + depth scale + horizon lift about the floor anchor (the shadow rides
  // along — it stays under the body); altitude lift goes on the idleRig translate INSIDE the scaled
  // frame so the rig scale projects it, and the shadow stays FLOOR-PINNED while the body rises
  // (attenuated by the SCREEN gap). Face configuration untouched — the whole being translates +
  // tilts together (momentum-rig face-safety idiom).
  // ADDITIVE + REVERSIBLE: zero pose => no worldRig transform => byte-identical raster.
  const WORLD_SPACE=Object.freeze({unitsPerContentPx:8,xHalf:960,yMax:1080,maxTiltDeg:45,homeViewDistance:1920,zNear:-320,zFar:3566,floorToHorizonPx:78,releaseTau:0.25}); // S7d (N35, 2026-08-06): zNear -1120->-320 — the owner's glass law: he may approach only until +20% size (1920/1600 = 1.2 exactly); farther-away shrink unchanged
  let worldPoseTarget={x:0,y:0,z:0,tilt:0,provenance:'none'};
  let worldPoseCurrent={x:0,y:0,z:0,tilt:0};
  let worldShadowAttenuated=false; // tracks whether the static shadow ellipses (groundOuter/contactShadowOuter/Core) carry altitude attenuation, so landing restores the authored values exactly once
  // Pressure-Cooker Cycle 3 (locomotion-legibility-phd-memo M3) — FLOOR-ANSWER CONTRAST FLOOR.
  // The shadow is the floor's only answer to the walk, so it must be READABLE: the stride-frequency
  // opacity swing at the band cruises must clear the contrast JND (Weber ≈ 8–10 % ⇒ floor 10 %).
  // DERIVED from the gait law itself: the weakest walk is the band-floor cruise (smallest vault bob —
  // GaitLaw L5: bob = l_eff·(1−cos α), tan α = λ/(2·l_eff), λ = v/stepHz(v), l_eff = 612); at the
  // D-0112 field (g = 74210) that bob ≈ 42.1 world units ≈ 5.26 content-px p2p ⇒ wGap half-swing
  // h ≈ 2.63 px at the home plane. The fade law 1/(1+wGap·G) swings relative p2p = 2hG/(1+hG);
  // solving 2hG/(1+hG) = 0.10 for G gives the floor below. max() with the authored gain: the authored
  // gain ALREADY clears the floor (Cycle 8 X1 bob 122.4 u at the band floor ⇒ ~51 % swing), so the
  // gain stays authored — the floor is law, not luck. At wGap=0 the multiplier is exactly 1 under ANY gain (home byte-stable, D-0088
  // idiom; reduced motion keeps gaitGate=0 ⇒ wGap stays 0 ⇒ authored values, bit-identical).
  const M3_BAND_MIN_CRUISE=Math.sqrt(0.15*74210*612); // GaitLaw comfortCruiseBand floor at the field g
  const M3_STEP_HZ=Math.min(M3_BAND_MIN_CRUISE/(0.75*1224),3.0240705333851228); // GaitLaw Cycle 8 X1 stride cadence (step-legibility-phd-memo): f=v/λ_norm, λ_norm=0.75·h_G, capped so the S1 exchange window (0.18144 of the period) never falls below τ_c=60ms — at the band floor the vault bob lands exactly on the 10% fence (triple convergence)
  const M3_BOB_UNITS=612*(1-Math.cos(Math.atan(M3_BAND_MIN_CRUISE/M3_STEP_HZ/1224))); // L5 vault arc
  const M3_WGAP_HALF_PX=M3_BOB_UNITS/8/2; // stride half-swing of wGap, content px, home plane
  const SHADOW_WGAP_GAIN=0.10/(M3_WGAP_HALF_PX*(1-0.10)); // CYCLE 13 L1 (contact-shadow-load-phd-memo): lift-fade gain re-derived at the Cycle-8 bob (h=7.64px half-swing) so the stride swing lands exactly on M3's 10% fence; the old max(0.045,·) floor was Cycle-3's authored gain, safe at Cycle-3's 42u bob but clipping after Cycle-8 X1 raised the bob to 122.4u p2p — the ceiling was never re-checked (cycle13 wall)
  // GASPER-SPACE-001 PHASE B / N36: physics motion may still drive material light,
  // but the former velocity-wake contour channel is retired end-to-end. setPhysicsWake
  // survives only as a compatibility no-op; no wake velocity or deformation state exists.
  // physLight remains a living-speed-unit scalar folded into MOTION_LIGHT and collapses
  // under reduced motion; zero at rest remains additive/reversible identity.
  let physLight=0; // D-0090 retained material-light feed; wake contour channel is retired.
  let physTake=0; // TAKE: eyes expand as VOLUME (no pupils). Overlaps body/light.
  let physIdle=0; // Arrived-hold height pulse, signed -1..1. Painter-owned. Not idleRig*(1+physTake/phi^2).
  let physBooBob=0; // S10 (owner N42): the Boo perpetual-bob carrier (world units, signed lift) — the ghost never stands; 0 from a non-boo load = byte-identical home
  // PRESSURE-COOKER CYCLE 1 (gait-expression-phd-memo, D-0116) — physics-authority gait feed.
  // Set ONLY through SidekickFormMasterRig.setPhysicsGait (the rig controller forwards the driver's
  // derived observables + screen projection). The renderer EXPRESSES the gait the kernel derived —
  // vault bob lifts the COM (high at mid-stance), lateral sway shifts it onto the support leg, the
  // grounded lean rides the existing tilt channel — it never authors a step. All terms additive +
  // reversible: zero gait => byte-identical raster; gated on motionStrength at the use site (L9).
  let physGait={phase:0,stepHz:0,bobUnits:0,leanDeg:0,swayUnits:0,speedRatio:0,bobLiftUnits:0,swayXUnits:0,rollDeg:0,contactSquash:0,stepBaseXUnits:0,bankDeg:0,stepFlattenUnits:0,stepFlattenWidthUnits:0,plantedScreenXUnits:0,plantedCompress:0,incomingCompress:0,hopMix:0,flight:0,seated:false,leftoverSway:0,supportSide:0,swingLiftUnits:0,swingAdvanceUnits:0,loadedDropUnits:0,swingClearance:0};
  // S4 WIND-RESISTANCE SURFACE (flight-physics-phd-memo F-LAW 2, owner N31): the
  // kernel's lagged airflow read — dynamic pressure (v/v_c)^2 in [0,1] + the
  // screen-x travel direction in [-1,1] (the setPhysicsWind intake below). At
  // rest both are exactly 0 => the wind contour channels are byte-identical.
  let physWind={pressure:0,dirX:0};
  // GASPER-CRAFT-001 · C4 — face-energy carrier. Set ONLY through the SidekickFormMasterRig.setFaceEnergy intake
  // (the rig controller forwards the performance-pack driver's `face` channel, compiled from AU-named face beats —
  // FaceBeats.ts). 0..1 scalar folded into composeFixtureMotion as the AU6+AU12 genuine-smile shape
  // (FACE_ENERGY_SHAPE mirror: curve .30 / open .06 / width .06 / pulls .12 / cheeks .18 / eye-squint −.04 per unit
  // energy). Zero at rest = identity (additive + reversible); expression persists at motionStrength 0 exactly like
  // the EIGHT_STATE_MOUTH grammar it composes beside.
  let physFaceEnergy=0; let physSilhouettePlantY=0;
  // GASPER-PHYSICS-001 · D-0112 — the BLACK ROOM (owner law N5: "gasper doesnt
  // need anything else in the scene with him, just a black room that acts as
  // his environment"). The CRAFT-002 "place" dressing — horizon + floor
  // gradients, depth lanes, the light pool, horizon tint, vignette — is
  // RETIRED: it was scenery, and the room is black. What remains of the
  // environment here:
  //  (a) NOTHING static — the room is the stage's pure-black background;
  //  (b) the authored impact ripple (pack channel ground_impact): the floor
  //      answers to weight (McCay ground-sag idiom, vector-only ring) — that
  //      is physics, not scenery; phase → shape with NO renderer timing (keys
  //      are truth, Doctrine 3a); invisible at rest => byte-stable home;
  //  (c) the floor itself reads ONLY from Gasper: the motivated floor glow +
  //      penumbra drop shadow live in the rig's ground-contact layer and ride
  //      with him (the shadow law below — D-0112 black-room drop shadow).
  // Mirrors packages/desktop/src/gasper/stage/StageWorld.ts (the ripple + the
  // floor-plane law); the mirror is machine-enforced by test.
  const STAGE_WORLD=Object.freeze({homeX:120,floorAnchorY:190}); // D-0112 black room (mirrors StageWorld.ts): scenery AND the N40-retired ripple constants gone; the floor anchor mirrors the worldRig pivot law
  const stageWorldEls={}; // N40 (2026-08-06): no floor-event element — the drop shadow is the floor's answer
  function initStageWorld(){
    if(stageWorldEls.root||typeof document==='undefined')return;
    if(!avatar||!worldRig||worldRig.parentNode!==avatar)return;
    const mk=(tag,attrs)=>{const el=document.createElementNS(NS,tag);for(const k in attrs)el.setAttribute(k,String(attrs[k]));return el;};
    // D-0112 black room: NO scenery — no horizon, no floor gradient, no lanes,
    // no pool, no vignette. The room is the stage's pure-black background.
    // The only environment element is the authored impact ripple (physics, not
    // scenery): the floor answers to weight at his (x, z), invisible at rest.
    const root=mk('g',{id:'stageWorld','data-craft-layer':'gasper-physics-001-black-room','pointer-events':'none'});
    // N40 (2026-08-06): the authored impact ripple (ground_impact ring) is RETIRED by owner
    // order — "he produces an odd ring at some of his jumps, get rid of that from the ground.
    // his drop shadow should be enough." No element is created; the intake below fails closed.
    avatar.insertBefore(root,worldRig); // behind the character; the floor itself reads from his own glow + shadow (ground-contact layer)
    stageWorldEls.root=root;
  }
  function updateGroundImpact(phase,x,z){return;} // N40 (2026-08-06): impact-ripple expression retired — the drop shadow is the floor's answer; call site retained as a no-op (camera_* retired idiom).
  let lifeScale = query.has('life') ? Math.max(0,Math.min(3,Number(query.get('life'))||0)) : 1;
  let behaviorProgress = 0;
  let behaviorMorphStatus = 'idle';
  let activeReliefMode = 'none';
  let paused = false, debugOn = false, selectedVertex = -1, selectedGrid = -1, lastPoints = [], lastMeshPoints = [];
  const gridSculpt=new Float32Array(2000);
  let stanceWasLive = false;
  const meshOffsets = Array.from({length:STRUCTURAL_NODES},()=>({x:0,y:0}));
  let dragOrigin = null;
  let lastTime = organismNow(), elapsed = 0, lastAuto = organismNow();
  // V2.4 REST GATE (D-0018): eased 0..1. When the rig is "settled" it goes to 0 and freezes the
  // AUTONOMOUS micro-motion (composeFixtureMotion gain + the drift sines below) so a settled frame
  // is bit-stable. This removes the perpetual high-Hz edge/chin buzz that is NOT a consequent of
  // natural movement (Cody's tremble bar; §7.1 no perpetual motion). The intended walk oscillator
  // and expression transitions are deliberately NOT gated. Eased (not snapped) in render().
  let bodyRestGate = 1;
  let breathGainE = 1; // GASPER-ALIVE-002 (D-0109) A-3: eased breathGain (tau .6 at the intake) so life-gate hand-offs never pop the idle transform
  let idleClockOffset = 0; // GASPER-ALIVE-002 (D-0109) A-2: phase-continuous idle clock — rebased on settled-hold release so the breath resumes from the held phase (no phase pop); a pure phase origin when the life floor is absent (D-0018 pin untouched)
  // V2.4 DETERMINISTIC SETTLED HOLD (D-0018, supersedes the eased gate as the chin-jitter fix):
  // a settled frame is made BIT-STABLE by freezing the body contour's time inputs (frameState +
  // cycleSeconds + idle) to a captured snapshot, so the SVG path string is byte-identical every
  // frame while held -> identical raster -> zero high-Hz cusp/edge flicker at ANY panel rate, by
  // construction (a mathematical identity, not a measured scalar). This is the literal form of the
  // ratified future-state #1 "settled frame == previous settled frame" and #4 "consequent-only
  // motion": at rest the avatar is grounded-still; it updates only on real events (a state retarget
  // or embodiment morph un-holds it), so the perpetual walk/micro that rocked the razor chin cusp
  // every frame is gone at rest. The walk returns as a gated performative clip in the queued
  // future-state work, not as perpetual motion. Face 3-part rig + topology lock untouched.
  let bodyHeld = false, heldFrameState = null, heldCycleSeconds = null, heldIdle = null;
  let lastHoldPaint = null;
   let smoothPts = null, smoothMesh = null; // V2.4 viscoelastic contour inertia buffers (D-0018)
   let viscoTau = 0.25; // V2.6 (D-0022): live-tunable viscoelastic weight (smoothing time-constant, seconds). Bigger = heavier/slower mass; smaller = quicker. Routed via the visco_tau pose key.
   // V2.7 LIVING GAZE / ATTENTION (D-0024): the eyes are the highest-speed visible intention channel
   // (§6.4) — they LEAD. A deterministic, aperiodic attention system: the gaze smoothly pursues a point
   // of interest, dwells, and returns to a calm center (calm social availability, §3.2). Deterministic,
   // not Math.random (DET-001; §7.1 forbids random twitch; §7.4 controlled asymmetry is deterministically
   // generated within bounds). Bounded amplitude = a subtle glance, not a roving eye. Eyes lead; the
   // mouth/face follows at a fraction (§7.3 layered timing: intent/eye orientation first). gazeAmp is a
   // live coeff (gaze_amp pose key). Frozen under reduced-motion / pause.
   let gazeX=0,gazeY=0,gazeTX=0,gazeTY=0,gazeNextAt=0,gazeHoldUntil=0,gazeIdx=0,gazeAmpLive=1.0,gazeLeanX=0,gazeRecogStart=0,gazeRecogEnd=0,gazeLeanFactor=0.45,gazeRecogAmp=0.18,pointerGazeTX=0,pointerGazeTY=0,pointerGazeX=0,pointerGazeY=0,pointerGazeActive=0,pointerGazeLastMove=0,externalGazeTX=0,externalGazeTY=0,externalGazeX=0,externalGazeY=0,externalGazeS=0; // GASPER-ALIVE-001 (D-0108): external attention intake state (normalized −1..1, strength 0..1)
  let attentionYawTargetDeg=0,attentionYawStrength=0,attentionYawDeg=0,userYawEngaged=false,exprBodyFe=0; // S5 (expression-attention-phd-memo): A-LAW attention-yaw carrier (setpoint° / strength / eased live°), the user-dial override flag (A-LAW 3) and the E-LAW lagged body-affect carrier (the body follows the face at τ_c·φ)
  let headingYawTargetDeg=0,headingYawDeg=0; // S8 (illustrator-turntable-2p5d-phd-memo): CONTINUOUS travel-facing carrier — setpoint is paint yaw on S1 (no 30° quantize, no ±45 fold); slice id is telemetry only; 0 from a never-moved load = byte-stable home
   // D-0029 REFRACTORY EMBODIMENT PHYSICS: automatic morphs carry one causal
   // Impact -> Spread -> Refractory operator. Manual scrub remains exact/linear.
   let morphImpactLive=0.10,morphSpreadLive=0.07,morphSettleLive=0.06;
  let demoIndex = Math.max(0, DEMO_SEQUENCE.indexOf(silhouetteProfile));
  let demoLastPhase = 0;
  if(query.has('motion'))motion.value=String(Math.max(0,Math.min(1,Number(query.get('motion'))||0)));
  if(query.has('energy'))interiorEnergy.value=String(Math.max(.15,Math.min(1.25,Number(query.get('energy'))||.72)));

  function emotionFixture(id){const fixture=EMOTION_FIXTURES[id];if(!fixture)throw new TypeError('unknown emotion fixture');return fixture;}
  function transitionProgress(now=organismNow()){const elapsedMs=Math.max(0,now-transitionStartedAt),durationMs=Math.max(1,transitionDuration*1000);return Math.max(0,Math.min(1,elapsedMs/durationMs));}
  function renderEmotionButtons(){document.querySelectorAll('[data-emotion]').forEach(button=>{button.classList.toggle('active',button.dataset.emotion===emotionFamily);button.onclick=()=>setEmotionFamily(button.dataset.emotion,0,{source:'ui'});});}
  function renderFixtureButtons(){const host=$('fixtureButtons'),ids=EMOTION_FAMILIES[emotionFamily]||[];host.replaceChildren(...ids.map((id,index)=>{const fixture=EMOTION_FIXTURES[id],button=document.createElement('button');button.type='button';button.dataset.fixture=id;button.textContent=fixture.label;button.classList.toggle('active',id===state);button.onclick=()=>setEmotionFixture(id,{source:'ui'});return button;}));}
  function updateRuntimeLabels(now=organismNow()){$('runtimeEmotion').textContent=emotionFamily[0].toUpperCase()+emotionFamily.slice(1);$('runtimeFixture').textContent=EMOTION_FIXTURES[state].label;const p=transitionProgress(now),active=p<.999&&transitionFromFixture!==transitionToFixture;$('runtimeTransition').textContent=runtimeDormant?'Dormant embodiment':active?`${EMOTION_FIXTURES[transitionFromFixture].label} → ${EMOTION_FIXTURES[transitionToFixture].label}`:'Holding fixture';$('runtimeInterruptions').textContent=`${interruptionCount} interruption${interruptionCount===1?'':'s'}`;$('runtimeTransitionBar').style.width=`${(p*100).toFixed(1)}%`;$('emotionDemo').textContent=emotionDemoMode?'Stop emotion sequence':'Play emotion sequence';updateBehaviorLabels();}
  let reliefPresetManual=false;
  function applyEmotionRelief(fixture){if(reliefPresetManual)return; if(Object.hasOwn(RELIEF_PRESETS,fixture.reliefMode))setReliefPreset(fixture.reliefMode);} // D-0080: do not stomp a manually set relief preset (the loop's eight-state goosebump system + the settings rail need manual presets to stick).
  function setEmotionFixture(id,{source='runtime',interrupted=false}={}){const fixture=emotionFixture(id),previous=state;activeFixtureBlend=null;if(previous===id&&transitionProgress()>.999){expressionPreviewMode='none';eyeRefractoryPreview=null;lastEyeRefractoryFrame=null;return;}expressionPreviewMode='automatic';eyeRefractoryPreview=null;lastEyeRefractoryFrame=null;const wasTransitioning=transitionProgress()<.999&&transitionFromFixture!==transitionToFixture;if(interrupted||wasTransitioning)interruptionCount+=1;transitionFromFixture=previous;transitionToFixture=id;transitionStartedAt=organismNow();transitionDuration=Math.max(.24,fixture.transitionSeconds||.72);transitionSerial+=1;state=id;emotionFamily=fixture.family;fixtureIndex=EMOTION_FAMILIES[emotionFamily]?.indexOf(id) ?? 0;target={...fixture};applyEmotionRelief(fixture);runtimeDormant=false;renderEmotionButtons();renderFixtureButtons();updateRuntimeLabels();avatar.dataset.emotion=emotionFamily;avatar.dataset.fixture=id;avatar.dataset.transitionSerial=String(transitionSerial);requestRuntimeFrame();}
  function setEmotionFamily(family,index=0,options={}){if(!EMOTION_FAMILIES[family])throw new TypeError('unknown emotion family');const ids=EMOTION_FAMILIES[family],safeIndex=Math.max(0,Math.min(ids.length-1,Number(index)||0));setEmotionFixture(ids[safeIndex],options);}
  function interruptEmotion(family='blocked',index=0){setEmotionFamily(family,index,{source:'interrupt',interrupted:true});}
  function enterDormant(profileId='dormant-orbit'){if(!['dormant-orbit','singularity'].includes(profileId))throw new TypeError('unsupported dormant profile');preDormantProfile=silhouetteProfile;preDormantFixture=state;preDormantFamily=emotionFamily;manualMorph=null;demoMode=false;silhouetteProfile=profileId;runtimeDormant=true;emotionDemoMode=false;applyFormPresence();applyLayerVisibility();renderSilhouetteProfileButtons();updateRuntimeLabels();requestRuntimeFrame();}
  function wakePresence(){manualMorph=null;demoMode=false;silhouetteProfile=preDormantProfile&&FORM_PROFILES[preDormantProfile]&&!['singularity','dormant-orbit'].includes(preDormantProfile)?preDormantProfile:'presence';runtimeDormant=false;setEmotionFixture(EMOTION_FIXTURES[preDormantFixture]?preDormantFixture:'neutral-social',{source:'wake',interrupted:true});applyFormPresence();applyLayerVisibility();renderSilhouetteProfileButtons();triggerMicrostate('wake',{strength:.8});}
  function microstateEnvelope(seconds){if(!activeMicrostate)return 0;if(activeMicrostate.manualProgress!==null)return Math.sin(Math.PI*Math.max(0,Math.min(1,activeMicrostate.manualProgress)))*activeMicrostate.strength;const progress=Math.max(0,(seconds-activeMicrostate.startedAtSeconds)/(activeMicrostate.durationMs/1000));behaviorProgress=Math.min(1,progress);if(progress>=1){activeMicrostate=null;behaviorProgress=0;return 0;}return Math.sin(Math.PI*progress)*activeMicrostate.strength;}
  function applyMicrostateToState(st,seconds){const amount=microstateEnvelope(seconds);if(!activeMicrostate||amount<=0)return{...st};const schema=MICROSTATE_SCHEMA[activeMicrostate.id],out={...st};for(const [key,delta] of Object.entries(schema.deltas))if(typeof out[key]==='number')out[key]+=delta*amount;return out;}
  function adaptFixtureToEmbodiment(st,fromId,toId,mix){const out={...st},low=profileWeight(fromId,toId,mix,'low-orbit'),comet=profileWeight(fromId,toId,mix,'comet'),wisp=profileWeight(fromId,toId,mix,'wispwalker'),halo=profileWeight(fromId,toId,mix,'halo'),lantern=profileWeight(fromId,toId,mix,'lantern'),dormant=Math.max(profileWeight(fromId,toId,mix,'singularity'),profileWeight(fromId,toId,mix,'dormant-orbit'));out.eyeOpenL*=1+.10*low+.035*comet-.08*dormant;out.eyeOpenR*=1+.10*low+.045*comet-.08*dormant;out.eyeWidthL*=1+.035*low+.025*comet;out.eyeWidthR*=1+.035*low+.025*comet;out.mouthOpen*=1+.06*low+.08*comet-.28*dormant;out.mouthCurve+=.025*low+.018*wisp+.015*lantern;out.postureY+=.22*low-.18*comet-.10*lantern;out.postureX+=.18*comet+.08*wisp;out.crown+=.02*halo+.035*lantern;out.motionGain*=1-.34*dormant+.06*wisp+.05*comet;out.energy*=1-.26*dormant+.04*halo+.05*lantern;out.wide=(out.wide||0)*2.8;out.low=(out.low||0)*2.8;out.crown=(out.crown||0)*2.8;out.asym=(out.asym||0)*2.8;return out;}
  const AMORPH_PHI=1.6180339887498949,AMORPH_PHI2=2.6180339887498949; // D-0057 PILLAR 4: golden ratio + its square; irrational => incommensurate harmonics (8.1 aperiodic; the never-ending loop of amorphous mathematics)
  function amorphWanderAt(seconds,freq,phase){const x=seconds*freq+phase;return (Math.sin(x)+0.62*Math.sin(x*AMORPH_PHI+1.13)+0.38*Math.sin(x*AMORPH_PHI2+2.71))/2.0;} // D-0057 PILLAR 4 smallest-slice wander kernel: 3 incommensurate golden harmonics => bounded ~[-1,1] quasi-periodic (never repeats); C-inf (5.3); pure function of the living clock; shape-only (no light/hue, D-0033-safe)
  function composeFixtureMotion(st,seconds,motionStrength){st=applyMicrostateToState(st,seconds);const _mCfg=(globalThis.__GASPER_LIVE_COEFFS__||{}).mouth||{};const _mK=EIGHT_STATE_MOUTH.enabled?(_mCfg.mouthGain??1):0;if(_mK!==0&&eightStateBodyEnabled){st.mouthCurve=(st.mouthCurve||0)+stateMouthCurve*_mK;st.mouthOpen=(st.mouthOpen||0)+stateMouthOpen*_mK;st.mouthSkew=(st.mouthSkew||0)+stateMouthSkew*_mK;st.pullR=(st.pullR||0)+stateMouthPullR*_mK;st.pullL=(st.pullL||0)+stateMouthPullL*_mK;}if(physFaceEnergy>0.001){const fe=physFaceEnergy;st.mouthCurve=(st.mouthCurve||0)+0.30*fe;st.mouthOpen=(st.mouthOpen||0)+0.06*fe;st.mouthWidth=(st.mouthWidth||0.5)+0.06*fe;st.pullR=(st.pullR||0)+0.12*fe;st.pullL=(st.pullL||0)+0.12*fe;st.cheekL=(st.cheekL||0)+0.18*fe;st.cheekR=(st.cheekR||0)+0.18*fe;st.eyeOpenL=Math.max(.015,(st.eyeOpenL||0)-0.04*fe);st.eyeOpenR=Math.max(.015,(st.eyeOpenR||0)-0.04*fe);}/* S5 E-LAW 1 (expression-attention-phd-memo): affect peaks couple into the SILHOUETTE — the body answers the face (C6). exprBodyFe is the lagged body carrier (E-LAW 2, render loop; motion-gated => reduced motion collapses it; 0 at rest => byte-identical): a base-anchored vertical stretch ε=εmax·fe (εmax=5%/φ, the golden cut of the R3 contact-squash fence) with the EXACT volume conjugate 1/(1+ε) on the horizontal (Sx·Sy=1 — the volume-law hard gate holds with equality), the rise re-planted at the base (arm = the 84 px form ry), and a slight equatorial rock ≤ 8/φ² px on the lean channel signed AWAY from the addressed direction. Rides the existing fixture pose channels (L9 integration idiom). */if(exprBodyFe>0.001){const _ebEps=(0.05/AMORPH_PHI)*exprBodyFe;st.postureScaleY=(st.postureScaleY||1)*(1+_ebEps);st.postureScaleX=(st.postureScaleX||1)/(1+_ebEps);st.postureY=(st.postureY||0)-_ebEps*84;const _ebRockS=attentionYawDeg>0.5?-1:1;st.bodyLean=(st.bodyLean||0)+_ebRockS*(8/(AMORPH_PHI*AMORPH_PHI2))*exprBodyFe;}/* GASPER-CRAFT-001 · C4 face-energy fold: the AU6+AU12 genuine-smile shape per unit energy — FACE_ENERGY_SHAPE (FaceBeats.ts) is the TS mirror; bounded by the no-pinch clamps below; zero at rest = byte-identical */const seed=st.microSeed||1,tempo=st.tempo||1,gain=(st.motionGain??.7)*motionStrength,a=Math.sin(seconds*.43*tempo+seed*1.91),b=Math.sin(seconds*.67*tempo+seed*.73),c=Math.cos(seconds*.31*tempo+seed*2.37);const _wCfg=(globalThis.__GASPER_LIVE_COEFFS__||{}).wander||{};const wK=(AMORPH_WANDER.enabled?(_wCfg.wanderAmp??1):0)*motionStrength;const wAsym=wK*AMORPH_WANDER.amp.asym*amorphWanderAt(seconds,0.051,0.0),wLean=wK*AMORPH_WANDER.amp.lean*amorphWanderAt(seconds,0.063,1.7),wWide=wK*AMORPH_WANDER.amp.wide*amorphWanderAt(seconds,0.043,3.1),wLow=wK*AMORPH_WANDER.amp.low*amorphWanderAt(seconds,0.037,4.9);avatar.dataset.wanderK=wK.toFixed(4);avatar.dataset.wanderAsym=wAsym.toFixed(4);avatar.dataset.wanderLean=wLean.toFixed(4);avatar.dataset.wanderWide=wWide.toFixed(4);avatar.dataset.wanderLow=wLow.toFixed(4);const _fo={...st,eyeLiftL:st.eyeLiftL+gain*(.18*a+.07*c),eyeLiftR:st.eyeLiftR+gain*(.16*b-.06*c),eyeOpenL:Math.max(.015,st.eyeOpenL),eyeOpenR:Math.max(.015,st.eyeOpenR),mouthCurve:st.mouthCurve+gain*.010*c,mouthSkew:st.mouthSkew+gain*.015*a,asym:st.asym+gain*.05*b+wAsym,crown:st.crown+gain*.012*a,energy:Math.max(.15,st.energy+gain*.018*c),postureX:st.postureX+gain*(2.6*a+1.1*c),postureY:st.postureY+gain*.5*b,postureScaleX:(st.postureScaleX||1)+gain*.016*c,postureScaleY:(st.postureScaleY||1)+gain*.013*a,wide:(st.wide||0)+gain*.06*b+wWide,low:(st.low||0)+gain*.05*a+wLow,bodyLean:(st.bodyLean||0)+gain*.02*c+wLean};_fo.mouthCurve=Math.max(-0.60,Math.min(0.60,_fo.mouthCurve||0));_fo.mouthOpen=Math.max(0,Math.min(0.70,_fo.mouthOpen||0));_fo.mouthSkew=Math.max(-0.35,Math.min(0.35,_fo.mouthSkew||0));let _pR=Math.max(0,Math.min(0.35,_fo.pullR||0)),_pL=Math.max(0,Math.min(0.35,_fo.pullL||0));if(_pR+_pL>0.50){const _ps=0.50/(_pR+_pL);_pR*=_ps;_pL*=_ps;}if(Math.abs(_pR-_pL)>0.25){if(_pR>=_pL)_pR=_pL+0.25;else _pL=_pR+0.25;}_fo.pullR=_pR;_fo.pullL=_pL;return _fo;}
  function blendFixtureState(fromId,toId,mix){const a=emotionFixture(fromId),b=emotionFixture(toId),out={...a,id:mix<.5?fromId:toId,family:mix<.5?a.family:b.family,label:mix<.5?a.label:b.label,note:mix<.5?a.note:b.note,reliefMode:mix<.5?a.reliefMode:b.reliefMode};for(const key of Object.keys(a))if(typeof a[key]==='number'&&typeof b[key]==='number')out[key]=lerp(a[key],b[key],mix);return out;}
  function setFixtureImmediate(id){const fixture=emotionFixture(id);activeFixtureBlend=null;expressionPreviewMode='none';eyeRefractoryPreview=null;lastEyeRefractoryFrame=null;state=id;emotionFamily=fixture.family;fixtureIndex=EMOTION_FAMILIES[emotionFamily]?.indexOf(id) ?? 0;transitionFromFixture=id;transitionToFixture=id;transitionDuration=fixture.transitionSeconds;transitionStartedAt=organismNow()-transitionDuration*1000;current={...fixture};target={...fixture};applyEmotionRelief(fixture);runtimeDormant=false;renderEmotionButtons();renderFixtureButtons();updateRuntimeLabels();avatar.dataset.emotion=emotionFamily;avatar.dataset.fixture=id;requestRuntimeFrame();}
  function setExpressionPreview(fromId,toId,mix,{eyeFrame=null}={}){activeFixtureBlend=null;const clamped=Math.max(0,Math.min(1,Number(mix)||0)),blended=blendFixtureState(fromId,toId,clamped),displayId=clamped<.5?fromId:toId;expressionPreviewMode=eyeFrame?'refractory':'manual';eyeRefractoryPreview=eyeFrame;lastEyeRefractoryFrame=eyeFrame?{...eyeFrame}:null;state=displayId;emotionFamily=EMOTION_FIXTURES[displayId].family;fixtureIndex=EMOTION_FAMILIES[emotionFamily]?.indexOf(displayId) ?? 0;transitionFromFixture=fromId;transitionToFixture=toId;transitionDuration=1;transitionStartedAt=organismNow()-(eyeFrame?.rawProgress??clamped)*1000;current={...blended};target={...blended};applyEmotionRelief(blended);renderEmotionButtons();renderFixtureButtons();updateRuntimeLabels();requestRuntimeFrame();}
  function allowedTransition(fromFamily,toFamily){return fromFamily===toFamily||(EMOTION_TRANSITION_GRAPH[fromFamily]||[]).includes(toFamily);}
  function normalizedBlendWeights(family,weights){const ids=EMOTION_FAMILIES[family];if(!ids)throw new TypeError('unknown emotion family');const source=Array.isArray(weights)?weights:ids.map(id=>Number(weights?.[id]??0));const clean=source.map(value=>Math.max(0,Number(value)||0));let total=clean.reduce((sum,value)=>sum+value,0);if(total<=0){clean[0]=1;total=1;}return clean.map(value=>value/total);}
  function blendFixtureWeights(family,weights){const ids=EMOTION_FAMILIES[family],norm=normalizedBlendWeights(family,weights),base={...EMOTION_FIXTURES[ids[0]]};for(const key of Object.keys(base)){if(typeof base[key]==='number')base[key]=ids.reduce((sum,id,index)=>sum+(Number(EMOTION_FIXTURES[id][key])||0)*norm[index],0);}const dominantIndex=norm.indexOf(Math.max(...norm)),dominantId=ids[dominantIndex];return{state:{...base,id:dominantId,family,label:`Blend · ${EMOTION_FIXTURES[dominantId].label}`,note:'Weighted semantic fixture blend.',reliefMode:EMOTION_FIXTURES[dominantId].reliefMode},ids,weights:norm,dominantId};}
  function setFixtureBlend(family,weights,{interrupted=true,source='behavior'}={}){expressionPreviewMode='none';eyeRefractoryPreview=null;lastEyeRefractoryFrame=null;const blend=blendFixtureWeights(family,weights),wasTransitioning=transitionProgress()<.999&&transitionFromFixture!==transitionToFixture;if(interrupted||wasTransitioning)interruptionCount+=1;transitionFromFixture=state;transitionToFixture=blend.dominantId;transitionStartedAt=organismNow();transitionDuration=.62;transitionSerial+=1;state=blend.dominantId;emotionFamily=family;fixtureIndex=EMOTION_FAMILIES[family].indexOf(state);target={...blend.state};activeFixtureBlend={family,ids:blend.ids,weights:blend.weights,dominantId:blend.dominantId,source};applyEmotionRelief(blend.state);runtimeDormant=false;renderEmotionButtons();renderFixtureButtons();renderFixtureBlendControls();updateRuntimeLabels();avatar.dataset.emotion=family;avatar.dataset.fixture=state;avatar.dataset.fixtureBlend='true';requestRuntimeFrame();return getBehaviorState();}
  function triggerMicrostate(id,{strength=1,durationMs,progress=null}={}){const schema=MICROSTATE_SCHEMA[id];if(!schema)throw new TypeError('unknown microstate');activeMicrostate={id,strength:Math.max(0,Math.min(2,Number(strength)||1)),durationMs:Math.max(80,Number(durationMs)||schema.durationMs),startedAtSeconds:elapsed,manualProgress:progress===null?null:Math.max(0,Math.min(1,Number(progress)||0))};behaviorProgress=progress===null?0:activeMicrostate.manualProgress;avatar.dataset.microstate=id;updateBehaviorLabels();requestRuntimeFrame();return getBehaviorState();}
  function setMicrostateProgress(id,progress,strength=1){return triggerMicrostate(id,{strength,durationMs:1000,progress});}
  function clearMicrostate(){activeMicrostate=null;behaviorProgress=0;delete avatar.dataset.microstate;updateBehaviorLabels();requestRuntimeFrame();return getBehaviorState();}
  function getBehaviorState(){return{version:'6.5.5',microstate:activeMicrostate?{...activeMicrostate}:null,fixtureBlend:activeFixtureBlend?{...activeFixtureBlend,weights:[...activeFixtureBlend.weights]}:null,preDormant:{profile:preDormantProfile,family:preDormantFamily,fixture:preDormantFixture},morphStatus:behaviorMorphStatus,morphSerial:behaviorMorphSerial,conversationSerial,progress:behaviorProgress,laggedEnergy,runtimeDormant};}
  function renderFixtureBlendControls(){const host=$('fixtureBlendControls');if(!host)return;const ids=EMOTION_FAMILIES[emotionFamily]||[],active=activeFixtureBlend?.family===emotionFamily?activeFixtureBlend.weights:ids.map(id=>id===state?1:0);host.replaceChildren(...ids.map((id,index)=>{const row=document.createElement('label');row.className='blend-row';const name=document.createElement('span');name.textContent=EMOTION_FIXTURES[id].label;const input=document.createElement('input');input.type='range';input.min='0';input.max='1';input.step='.01';input.value=String(active[index]??0);input.dataset.blendIndex=String(index);const value=document.createElement('span');value.textContent=Number(input.value).toFixed(2);input.oninput=()=>{value.textContent=Number(input.value).toFixed(2);const values=[...host.querySelectorAll('input')].map(node=>Number(node.value));setFixtureBlend(emotionFamily,values,{interrupted:false,source:'ui'});};row.append(name,input,value);return row;}));}
  function renderBehaviorControls(){const host=$('microstateButtons');if(host)host.replaceChildren(...MICROSTATE_ORDER.slice(0,9).map(id=>{const button=document.createElement('button');button.type='button';button.textContent=MICROSTATE_SCHEMA[id].label;button.dataset.microstate=id;button.onclick=()=>triggerMicrostate(id);return button;}));renderFixtureBlendControls();updateBehaviorLabels();}
  function updateBehaviorLabels(){const micro=$('behaviorMicrostate'),blend=$('behaviorBlend'),memory=$('behaviorMemory'),morph=$('behaviorMorph'),bar=$('behaviorProgress');if(micro)micro.textContent=activeMicrostate?MICROSTATE_SCHEMA[activeMicrostate.id].label:'none';if(blend)blend.textContent=activeFixtureBlend?`${activeFixtureBlend.family} · ${activeFixtureBlend.weights.map(v=>v.toFixed(2)).join('/')}`:'fixture endpoint';if(memory)memory.textContent=`${preDormantFamily} · ${preDormantFixture}`;if(morph)morph.textContent=behaviorMorphStatus;if(bar)bar.style.width=`${Math.max(0,Math.min(1,behaviorProgress))*100}%`;}
  let organismDelaySerial=0;
  function sleep(ms){const duration=Math.max(0,Number(ms)||0),started=organismNow(),id='formmaster-delay-'+(++organismDelaySerial);return new Promise(resolve=>{let unsub=null;const finish=()=>{if(unsub){const release=unsub;unsub=null;release();}resolve();};if(duration===0)return finish();unsub=organismClock.subscribe({id,priority:60,onFrame:frame=>{if(frame.timeMs-started>=duration)finish();}});});}
  function directEmbodimentRoute(from,to){return from===to||(EMBODIMENT_TRANSITION_GRAPH[from]||[]).includes(to);}
  function routeEmbodiments(from,to){if(from===to)return[];if(directEmbodimentRoute(from,to))return[to];if(from==='singularity')return['dormant-orbit',...(to==='dormant-orbit'?[]:routeEmbodiments('dormant-orbit',to))];if(to==='singularity')return[...(from==='dormant-orbit'?[]:routeEmbodiments(from,'dormant-orbit')),'singularity'];if(from!=='presence'&&to!=='presence')return['presence',to];return[to];}
  function easeBehavior(t,easing='smooth'){if(easing==='linear')return t;if(easing==='soft')return t*t*(3-2*t);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
  function sampleRefractoryArc(progress){
    const rawProgress=Math.max(0,Math.min(1,Number(progress)||0)),impactEnd=.22,spreadEnd=.72,impactCommitment=.12,spreadCommitment=.90;
    let mix=0;
    if(rawProgress<=impactEnd)mix=impactCommitment*smoothstep(0,1,rawProgress/impactEnd);
    else if(rawProgress<=spreadEnd)mix=impactCommitment+(spreadCommitment-impactCommitment)*smoothstep(0,1,(rawProgress-impactEnd)/(spreadEnd-impactEnd));
    else mix=spreadCommitment+(1-spreadCommitment)*smoothstep(0,1,(rawProgress-spreadEnd)/(1-spreadEnd));
    const impactT=Math.max(0,Math.min(1,rawProgress/impactEnd)),spreadT=Math.max(0,Math.min(1,(rawProgress-impactEnd*.55)/(spreadEnd-impactEnd*.55))),refractoryT=Math.max(0,Math.min(1,(rawProgress-spreadEnd)/(1-spreadEnd)));
    const impact=rawProgress<=impactEnd?Math.sin(Math.PI*impactT):0,spread=rawProgress>=impactEnd*.55&&rawProgress<=spreadEnd?Math.sin(Math.PI*spreadT):0,refractory=rawProgress>=spreadEnd?Math.sin(Math.PI*refractoryT)*(1-refractoryT*.35):0,residual=rawProgress>=spreadEnd?Math.sin(Math.PI*2*refractoryT)*Math.pow(1-refractoryT,1.45):0;
    return{rawProgress,mix:Math.max(0,Math.min(1,mix)),phase:rawProgress>=.999?'settled':rawProgress<impactEnd?'impact':rawProgress<spreadEnd?'spread':'refractory',impact,spread,refractory,residual};
  }
  function transitionRouteHash(fromId,toId){let h=2166136261;for(const ch of `${fromId}>${toId}`){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0)/4294967295;}
  function refractoryMorphTransform(fromId,toId,arc){
    if(!arc)return null;
    const a=formProjectionFrame(FORM_PROFILES[fromId]),b=formProjectionFrame(FORM_PROFILES[toId]),dx=Math.max(-1,Math.min(1,(b.cx-a.cx)/64)),dy=Math.max(-1,Math.min(1,(b.cy-a.cy)/64)),dw=Math.max(-1,Math.min(1,(b.rx-a.rx)/96)),dh=Math.max(-1,Math.min(1,(b.ry-a.ry)/96)),distance=Math.max(.2,Math.min(1,Math.hypot(dx,dy,dw,dh))),chirality=transitionRouteHash(fromId,toId)<.5?-1:1,weight=.55+.45*distance,impact=arc.impact*morphImpactLive*weight,spread=arc.spread*morphSpreadLive*weight,residual=arc.residual*morphSettleLive*weight;
    const sx=Math.max(.82,Math.min(1.18,1-impact*(.52+.22*Math.abs(dx))+spread*dw*.28+residual*chirality*.42)),sy=Math.max(.82,Math.min(1.18,1+impact*(.24+.12*Math.abs(dy))+spread*dh*.24-residual*chirality*.26)),tx=(-dx*impact+dx*spread*.65+chirality*residual*.42)*34,ty=(-dy*impact+dy*spread*.65-Math.abs(residual)*.16)*28,rotation=(chirality*impact*.26+dx*spread*.44+chirality*residual)*7;
    const frameA=formProjectionFrame(FORM_PROFILES[fromId]),frameB=formProjectionFrame(FORM_PROFILES[toId]);
    return{...arc,cx:lerp(frameA.cx,frameB.cx,arc.mix),cy:lerp(frameA.cy,frameB.cy,arc.mix),sx,sy,tx,ty,rotation,routeDistance:distance,chirality};
  }
  function applyRefractoryPoint(point,physics){if(!physics)return point;const x=point.x-physics.cx,y=point.y-physics.cy,r=physics.rotation*Math.PI/180,cos=Math.cos(r),sin=Math.sin(r),sx=x*physics.sx,sy=y*physics.sy,nx=sx*cos-sy*sin+physics.cx+physics.tx,ny=sx*sin+sy*cos+physics.cy+physics.ty;return{...point,x:nx,y:ny,sourceX:Number.isFinite(point.sourceX)?nx:point.sourceX,sourceY:Number.isFinite(point.sourceY)?ny:point.sourceY};}
  function applyRefractoryPointSet(points,physics){return physics?points.map(point=>applyRefractoryPoint(point,physics)):points;}
  function applyRefractoryAnchors(anchors,physics){if(!physics)return anchors;const transform=anchor=>{const point=applyRefractoryPoint(anchor,physics);return{...anchor,x:point.x,y:point.y};};return{eyeL:transform(anchors.eyeL),eyeR:transform(anchors.eyeR),mouth:transform(anchors.mouth)};}
  function setMorphTransitionPreview(from,to,progress,{startMix=0,endMix=1}={}){if(!FORM_PROFILES[from]||!FORM_PROFILES[to])throw new TypeError('unknown morph profile');const arc=sampleRefractoryArc(progress),mix=Math.max(0,Math.min(1,lerp(startMix,endMix,arc.mix))),transitionArc={...arc,mix};manualMorph={from,to,mix,rawProgress:arc.rawProgress,transitionArc};demoMode=false;silhouetteProfile=from;applyFormPresence();renderSilhouetteProfileButtons();return{...transitionArc};}
  function animateMorphPreview(from,to,startMix,endMix,durationMs,serial,easing='smooth'){return new Promise(resolve=>{const started=organismNow();const subId='formmaster-morph-'+serial;let unsub=null;function finish(result){if(unsub){unsub();unsub=null;}resolve(result);}unsub=subscribeFormMasterClock({id:subId,priority:50,onFrame:function(frame){if(serial!==behaviorMorphSerial)return finish({cancelled:true});const p=Math.max(0,Math.min(1,(frame.timeMs-started)/Math.max(1,durationMs))),paced=easeBehavior(p,easing);globalThis.SidekickFormMasterRig.setMorphTransitionPreview(from,to,paced,{startMix,endMix});behaviorProgress=p;updateBehaviorLabels();if(p>=1)finish({cancelled:false});}});ensureFormMasterClockSubscription();});}
  async function morphToBehavioral(name,{durationMs=980,easing='smooth'}={}){if(!FORM_PROFILES[name])throw new TypeError('unknown embodiment');const serial=++behaviorMorphSerial;gasperMorphSerial+=1;conversationSerial+=1;let snapshot=globalThis.SidekickFormMasterRig.getSnapshot();behaviorMorphStatus='retargeting';updateBehaviorLabels();let from=snapshot.profile;if(snapshot.morph){const morph=snapshot.morph,settleTo=morph.mix<.5?morph.from:morph.to,end=morph.mix<.5?0:1;behaviorMorphStatus=`recover ${morph.from} ↔ ${morph.to}`;const recovered=await animateMorphPreview(morph.from,morph.to,morph.mix,end,Math.max(160,durationMs*.28),serial,'soft');if(recovered.cancelled)return getBehaviorState();globalThis.SidekickFormMasterRig.clearMorphPreview();globalThis.SidekickFormMasterRig.setProfile(settleTo,'settle');from=settleTo;}const route=routeEmbodiments(from,name);if(!route.length){behaviorMorphStatus='idle';behaviorProgress=0;updateBehaviorLabels();return gasperMetadata();}const segmentDuration=Math.max(260,durationMs/route.length);let cursor=from;for(const step of route){if(serial!==behaviorMorphSerial)return getBehaviorState();behaviorMorphStatus=`${cursor} → ${step}`;const result=await animateMorphPreview(cursor,step,0,1,segmentDuration,serial,easing);if(result.cancelled)return getBehaviorState();globalThis.SidekickFormMasterRig.clearMorphPreview();globalThis.SidekickFormMasterRig.setProfile(step,'settle');cursor=step;}behaviorMorphStatus='idle';behaviorProgress=0;updateBehaviorLabels();gasperEmit('behavioralsettled',{embodiment:name,route});return gasperMetadata();}
  async function enterDormantBehavior(profileId='dormant-orbit',{durationMs=1250}={}){if(!['dormant-orbit','singularity'].includes(profileId))throw new TypeError('unsupported dormant profile');const snapshot=globalThis.SidekickFormMasterRig.getSnapshot();preDormantProfile=snapshot.morph?(snapshot.morph.mix<.5?snapshot.morph.from:snapshot.morph.to):snapshot.profile;preDormantFixture=state;preDormantFamily=emotionFamily;const route=DORMANT_ENTRY_ROUTES[emotionFamily]||DORMANT_ENTRY_ROUTES.neutral;setEmotionFixture(route.fixture,{source:'dormant-entry',interrupted:true});runtimeDormant=true;triggerMicrostate(route.microstate,{strength:.78,durationMs:Math.min(900,durationMs*.68)});updateRuntimeLabels();await sleep(90);await morphToBehavioral(profileId,{durationMs});runtimeDormant=true;clearMicrostate();updateRuntimeLabels();gasperEmit('dormantentered',{profile:profileId,prior:{profile:preDormantProfile,family:preDormantFamily,fixture:preDormantFixture}});return gasperMetadata();}
  async function wakeBehavior({durationMs=1250,profile}={}){const targetProfile=profile||(FORM_PROFILES[preDormantProfile]&&!['singularity','dormant-orbit'].includes(preDormantProfile)?preDormantProfile:'presence'),restoreFixture=EMOTION_FIXTURES[preDormantFixture]?preDormantFixture:(EMOTION_FAMILIES[preDormantFamily]?.[0]||'neutral-social');runtimeDormant=false;const morphPromise=morphToBehavioral(targetProfile,{durationMs});await sleep(Math.max(120,durationMs*.42));setEmotionFixture(restoreFixture,{source:'wake-context',interrupted:true});triggerMicrostate('wake',{strength:.85,durationMs:Math.max(500,durationMs*.68)});await morphPromise;gasperEmit('wakerestored',{profile:targetProfile,family:preDormantFamily,fixture:restoreFixture});return gasperMetadata();}
  async function runConversationSequence({stepMs=650}={}){const serial=++conversationSerial;const sequence=[['neutral-social','acknowledge'],['listening-orient','orient'],['listening-hold',null],['thinking-scan','processing'],['thinking-resolve','reconsider'],['pleased-contained','response'],['listening-receive','acknowledge'],['neutral-wry','amusement']];for(const [fixture,micro] of sequence){if(serial!==conversationSerial)return getBehaviorState();setEmotionFixture(fixture,{source:'conversation',interrupted:true});if(micro)triggerMicrostate(micro,{durationMs:stepMs*.82});await sleep(stepMs);}clearMicrostate();gasperEmit('conversationcomplete',{serial});return gasperMetadata();}
  function cancelBehavior(){behaviorMorphSerial+=1;gasperMorphSerial+=1;conversationSerial+=1;behaviorMorphStatus='idle';behaviorProgress=0;clearMicrostate();updateBehaviorLabels();return getBehaviorState();}
  function gaussAngle(theta, mu, sigma){ let d = (theta - mu + Math.PI) % (2*Math.PI) - Math.PI; return Math.exp(-0.5*Math.pow(d/sigma,2)); }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function smoothstep(a,b,x){ if(x<=a)return 0;if(x>=b)return 1;const t=(x-a)/(b-a);return t*t*(3-2*t); }
  function effectiveViewYaw(){const v=viewYawDegrees+headingYawDeg+attentionYawDeg;return Math.max(-180,Math.min(180,v));} // S5 A-LAW 3 + S8 N39 (radial-facing-phd-memo): attention yaw AND the 12-slice travel-facing compose ADDITIVELY over the dial/living base yaw, fenced to the FULL circle ±180 — at ±180 he faces AWAY (12 o'clock). At rest (both carriers 0) the dial passes through unchanged.
  function viewAmount(){return Math.max(-1,Math.min(1,effectiveViewYaw()/AUTHORED_YAW_RANGE[1]));} // S5: amount is now SIGNED (negative = addressing left); SATURATED at ±1 (S8): the authored cone law caps at its 45° maximum — the full circle is the extension law's, never an explosion of the authored curve. Symmetric-magnitude consumers take |amount|, side-coupled consumers keep the sign (the near/far geometry flips with it — sign-extension audit in the memo)
  function authoredTurnEase(){const t=Math.min(1,Math.abs(viewAmount()));return t*t*(3-2*t);} // S5 sign-safety: the smoothstep is applied to |amount| (t²(3−2t) breaks on negative t); the handedness lives in the sgn factors at the use sites. Dial-only (attention 0) => byte-identical to the prior curve.
  function formProjectionFrame(profile){
    if(profile.projectionFrame)return profile.projectionFrame;
    if(profile.geometryModel==='ground-tangent-puddle')return{cx:120,cy:136,rx:105,ry:42};
    if(profile.geometryModel==='forward-mass-attached-wake')return{cx:132,cy:108,rx:118,ry:66};
    if(profile.geometryModel==='dormant-family'){const collapse=Math.max(0,Math.min(1,profile.dormantCollapse||0));return{cx:120,cy:111.5,rx:lerp(80,82,collapse),ry:lerp(76,68,collapse)};}
    return{cx:120+profile.cx,cy:110+profile.cy,rx:82*profile.sx,ry:84*profile.sy};
  }
  function authorKeyViewPoint(point,profile,surfaceInfluence=1){
    const frame=formProjectionFrame(profile),cx=frame.cx,cy=frame.cy,lifted=liftSurfacePoint(point,profile);
    const eff=effectiveViewYaw();
    if(eff===0)return{...point,sourceX:point.x,sourceY:point.y,latentDepth:0,projectedDepth:0};
    // S5 sign-extension (expression-attention-phd-memo): the near/far roles belong to a SCREEN SIDE,
    // so the lobe selection runs in mirrored coordinates mx=sgn·nx (the near side is always mx>0) and
    // every x-shift carries sgn — a negative yaw is the exact mirror of the positive-yaw deformation.
    // Dial-only (eff>0, attention 0): sgn=+1, mx=nx => byte-identical to the ratified one-sided curve.
    const sgn=eff<0?-1:1,turn=authoredTurnEase(),nx=lifted.objectX/frame.rx,ny=lifted.objectY/frame.ry,mx=sgn*nx;
    const verticalEnvelope=Math.pow(Math.max(0,1-Math.abs(ny)),.72),interiorEnvelope=Math.max(0,1-Math.hypot(nx,ny));
    const lobeBand=Math.exp(-.5*Math.pow(ny/.32,2)),identityShift=1.2*turn*verticalEnvelope;
    const nearExpansion=3.6*turn*Math.pow(Math.max(0,mx),.78)*lobeBand,farTuck=4.8*turn*Math.pow(Math.max(0,-mx),.78)*lobeBand;
    const crownBias=1.4*turn*Math.max(0,-ny)*(1-Math.min(1,Math.abs(nx))),depthParallax=lifted.latentDepth*.12*sgn*turn*surfaceInfluence;
    const anchorX=point.x+sgn*(identityShift+nearExpansion+farTuck+crownBias)+depthParallax;
    const anchorY=point.y+1.55*turn*mx*verticalEnvelope+.75*turn*ny*interiorEnvelope;
    return{...point,sourceX:point.x,sourceY:point.y,objectX:lifted.objectX,objectY:lifted.objectY,latentDepth:lifted.latentDepth,projectedDepth:lifted.latentDepth*(1-.18*turn)-lifted.objectX*.45*sgn*turn,x:lerp(point.x,anchorX,surfaceInfluence),y:lerp(point.y,anchorY,surfaceInfluence),anchorX,anchorY};
  }
  function getViewMetrics(profile=FORM_PROFILES[silhouetteProfile]){
    const frame=formProjectionFrame(profile),amount=viewAmount(),sgn=amount<0?-1:1,absAmt=Math.abs(amount),faceCenter=authorKeyViewPoint({x:frame.cx,y:frame.cy+1},profile,1);
    const effDeg=effectiveViewYaw(),absDeg=Math.abs(effDeg);
    // Illustrator turntable (illustrator-turntable-2p5d-phd-memo): painted
    // width is the finite-thickness ellipse — C-inf on S1. No 45° gate,
    // no reciprocal height, no card squash. θ=0 => facingCompress=1.
    const _yawRad=effDeg*Math.PI/180,_sideThickness=0.90;
    const _orthoWidth=Math.sqrt(Math.cos(_yawRad)*Math.cos(_yawRad)+_sideThickness*_sideThickness*Math.sin(_yawRad)*Math.sin(_yawRad));
    const facingCompress=_orthoWidth;
    const _lobeSin=Math.sin(_yawRad),_absLobe=Math.abs(_lobeSin);
    const faceTurnFade=Math.max(0,Math.min(1,Math.pow(Math.max(0,Math.min(1,(absDeg-110)/45)),2)*(3-2*Math.max(0,Math.min(1,(absDeg-110)/45)))));
    const backPresence=Math.max(0,Math.min(1,Math.pow(Math.max(0,Math.min(1,(absDeg-100)/40)),2)*(3-2*Math.max(0,Math.min(1,(absDeg-100)/40)))));
    const hemisphere=Math.max(0,Math.min(1,(1-Math.cos(_yawRad))/2));
    const _sm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/Math.max(1e-6,b-a)));return t*t*(3-2*t);};
    // N178: apertures belong to the volume. Slide along the authored hull, never
    // a heading-target card throw. ±18 keeps eyes/mouth inside the membrane.
    const rawFaceShift=faceCenter.x-frame.cx,faceShift=Math.max(-18,Math.min(18,rawFaceShift*(1-faceTurnFade)));
    const farArmVis=Math.max(0.78,1-_sm(90,140,absDeg));
    const footOverlap=_sm(42,78,absDeg),footTrack=1-footOverlap;
    const farEyeScaleL=1-0.10*Math.max(0,_lobeSin),farEyeScaleR=1-0.10*Math.max(0,-_lobeSin);
    return{yaw:viewYawDegrees,effectiveYaw:effDeg,amount,faceShift,faceCompression:facingCompress,nearLobeScale:1+0.05*_absLobe,farLobeScale:1-0.06*_absLobe,tailOpacity:0,discPerspective:.92-.20*_absLobe,viewDepthRole:absDeg<12?'front-symmetric':(absDeg>105?'back-turned':(_lobeSin>0?'right-near-left-far':'left-near-right-far')),hemisphere,faceTurnFade,backPresence,facingCompress,projection:'finite-thickness-turntable-s1',projectedFaceDepth:faceCenter.projectedDepth,farArmVis,footOverlap,footTrack,farEyeScaleL,farEyeScaleR};
  } // S5+S8 (illustrator-turntable-2p5d-phd-memo): painted width/lobes/fade are continuous on S1; viewAmount still saturates so the authored cone contour is not exploded. θ=0 facingCompress=1.
  function idleCycleAt(seconds){
    const phase=((seconds/IDLE_CYCLE_SECONDS)%1+1)%1;
    const breath=(1-Math.cos(phase*Math.PI*2))*.5;
    const driftX=Math.sin(phase*Math.PI*2)*.9;
    const liftY=-1.2*breath+.14*Math.sin(phase*Math.PI*4);
    const blinkDistance=Math.abs(((phase-.70+.5)%1+1)%1-.5);
    const blinkWindow=0;
    const blink=0;
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
  const KAPPA_TH_CAP=0.9,KAPPA_LOWER_SIN=0.12,KAPPA_ITERS=8,KAPPA_PULL=0.55;
  function kappaBoxLower(pts,S){
    const GN=globalThis.__GASPER_GEONODES_EVAL__||{};
    if(GN.mute&&GN.mute.kappa)return pts;
    if(!pts||pts.length<8||!S||!(S.live>0.004))return pts;
    const cap=Number(GN.params&&GN.params.kappa&&GN.params.kappa.cap)||KAPPA_TH_CAP;
    const n=pts.length;let iL=0,iR=0,iC=0,mL=-1,mR=-1,mC=-1;
    for(let i=0;i<n;i++){
      const th=pts[i].th??pts[i].theta??0;
      const wL=gaussAngle(th,1.83,0.11),wR=gaussAngle(th,1.31,0.11),wC=gaussAngle(th,Math.PI/2,0.09);
      if(wL>mL){mL=wL;iL=i;}if(wR>mR){mR=wR;iR=i;}if(wC>mC){mC=wC;iC=i;}
    }
    for(let iter=0;iter<KAPPA_ITERS;iter++){
      const xs=new Float64Array(n),ys=new Float64Array(n);
      for(let i=0;i<n;i++){xs[i]=pts[i].x;ys[i]=pts[i].y;}
      for(let i=0;i<n;i++){
        if(i===iL||i===iR||i===iC)continue;
        const th=pts[i].th??pts[i].theta??0;
        if(Math.sin(th)<=KAPPA_LOWER_SIN)continue;
        const a=(i+n-1)%n,c=(i+1)%n;
        const turn=Math.atan2((xs[i]-xs[a])*(ys[c]-ys[i])-(ys[i]-ys[a])*(xs[c]-xs[i]),(xs[i]-xs[a])*(xs[c]-xs[i])+(ys[i]-ys[a])*(ys[c]-ys[i]));
        const over=Math.abs(turn)-cap;
        if(over<=0)continue;
        const s=Math.min(0.85,KAPPA_PULL+0.25*(over/KAPPA_TH_CAP));
        pts[i].x=xs[i]*(1-s)+0.5*s*(xs[a]+xs[c]);
        pts[i].y=ys[i]*(1-s)+0.5*s*(ys[a]+ys[c]);
      }
    }
    return pts;
  }
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
    for(const mu of [0,Math.PI]){
      baseRadius+=6.5*(gaussAngle(th,mu-0.09,0.15)+gaussAngle(th,mu+0.09,0.15));
      baseRadius-=3.8*gaussAngle(th,mu-0.31,0.11);
      baseRadius-=3.8*gaussAngle(th,mu+0.31,0.11);
    }
    baseRadius-=0.45*gaussAngle(th,Math.PI/2,0.18);
    baseRadius+=0.52*gaussAngle(th,-0.34,0.48)-0.28*gaussAngle(th,Math.PI+0.30,0.48);
    return baseRadius;
  }
  // PRESSURE-COOKER CYCLE 12 (embodiment-silhouette-phd-memo W1/W2) — the contact flatten as a
  // standalone carrier so BOTH consumers agree on one law: formRadiusAtFor adds it to EVERY family
  // base (the dormant branches no longer return early before it — the silhouette gate is
  // embodiment-invariant), and mapFormPoint subtracts it back out of the dormant-family
  // normalization base so the delta SURVIVES the radiusScale quotient instead of dividing out
  // (the cycle-12 wall: the torus slid while the presence form stepped). Same gate idiom as the
  // walkScaffoldZ above: snapped at 0.004 px + live-motion gate; at init the physGait carrier is
  // exactly zero, so the numeric check short-circuits first. Zero gait / reduced motion => returns
  // exactly 0 => byte-identical dormant art (W1/W4, D-0088). The theta anchors (1.34 screen-x right
  // / 1.80 screen-x left) are the bottom-side plant points for every profile; mapDormantFamily maps
  // them onto the lower rim of the disc/torus (Z1 form-adapted).
  function gaitFlattenRadiusDelta(th){
    // N326: flatten merges Wispwalker's two-root cleft into a pad.
    // Identity carve stays; gait must not rewrite this hull.
    if(silhouetteProfile==='wispwalker')return 0;
    const _fdPx=physGait.stepFlattenUnits/WORLD_SPACE.unitsPerContentPx,_fwPx=physGait.stepFlattenWidthUnits/WORLD_SPACE.unitsPerContentPx;
    if(!(Math.abs(_fdPx)>=0.004&&_fwPx>=0.004&&Number(motion.value)>0.01))return 0;
    const _fpTh=_fdPx>0?1.34:1.80,_fpD=Math.abs(_fdPx),_fpSig=Math.max(0.02,_fwPx/72);
    return -_fpD*gaussAngle(th,_fpTh,_fpSig)+(_fpD/(2*AMORPH_PHI))*gaussAngle(th,_fpTh-2.5*_fpSig,AMORPH_PHI*_fpSig)+(_fpD/(2*AMORPH_PHI))*gaussAngle(th,_fpTh+2.5*_fpSig,AMORPH_PHI*_fpSig);
  }
  // S4 WIND-RESISTANCE SURFACE (flight-physics-phd-memo F-LAW 2, owner N31:
  // "a slight wind resistance ACROSS his form" as he jets) — the airflow read
  // expressed on the base contour: the TRAILING edge extends along −travel
  // (trail-stretch ε = ε_max·p, ε_max = φ⁻²/4 of the ~72 px base half-extent
  // at v_c — SLIGHT, the owner's word), the LEADING edge compresses ε/φ
  // (lead-compress). Broad axial gauss lobes (σ 0.62 — a squeeze across the
  // form, not a bump): the crown/face plane sits at cos θ ≈ 0 so the face
  // grammar is untouched by construction; the clip/anchors ride the SAME
  // contour so nothing misaligns (vector-only, topology unchanged). The
  // kernel derives pressure + direction (lagged τ_c·φ); the renderer expresses.
  // One law, every embodiment — a walker at cruise pays the air its toll too.
  // Amplitude scales with |dirX| so pure depth travel reads honestly invisible
  // in screen x (the S0 projection idiom) and a reversal passes through zero
  // (no side-swap pop). Same gate idiom as the flatten above: numeric check
  // leads (the carrier is exactly zero at init / rest) then the motion dial —
  // zero pressure or reduced motion => returns exactly 0 => byte-identical
  // contour (D-0088 idiom).
  const WIND_EPS_MAX_PX=72/(AMORPH_PHI2*4); // ε_max = φ⁻²/4 of the 72 px base half-extent ≈ 6.88 px at v_c
  function windStretchRadiusDelta(th){
    const _wp=physWind.pressure,_wd=physWind.dirX;
    if(!(_wp>=0.004&&Math.abs(_wd)>=0.004&&Number(motion.value)>0.01))return 0;
    const _wa=WIND_EPS_MAX_PX*_wp*Math.abs(_wd);
    const _trailTh=_wd>0?Math.PI:0,_leadTh=_wd>0?0:Math.PI; // trailing side is opposite travel; th 0 = screen-x right
    return _wa*gaussAngle(th,_trailTh,0.62)-(_wa/AMORPH_PHI)*gaussAngle(th,_leadTh,0.62);
  }
  function formRadiusAtFor(profileId,th){
    let radius=baseRadiusV63(th);
    if(profileId==='singularity'){
      radius-=1.1;
      radius+=1.8*(gaussAngle(th,0,.18)+gaussAngle(th,Math.PI,.18));
    }else if(profileId==='dormant-orbit'){
      radius-=.55;
      radius+=2.8*(gaussAngle(th,0,.17)+gaussAngle(th,Math.PI,.17));
    }
    if(profileId==='wispwalker'){
      // WISPWALKER STANCE (D-0016, reference 10_wispwalker_held.png): the silhouette stays
      // the upright social PEARL — same crown, same face region, same mid side-lobes (a
      // touch sharper). The ONLY authored delta vs presence is at the base: the round bowl
      // becomes a soft teardrop chin with a center cleft = the two load-bearing foot-root
      // lobes. No neck, no torso, no waist (the prior humanoid carve read as a hard body
      // squeezed into shape). Animated nub feet/arms + walk-in-place layer on top of this
      // pearl later as the new-system upgrade.
      const _wc=(globalThis.__GASPER_LIVE_COEFFS__||{}).wispwalker||{};
      const _wcc=WISPWALKER_CANONICAL_CONTOUR;
      radius+=(_wc.crownAmp??_wcc.crownAmp)*gaussAngle(th,_wcc.crownTheta,_wcc.crownSigma);
      radius-=_wcc.lowerBowlTrimAmp*gaussAngle(th,_wcc.lowerBowlTrimTheta,_wcc.lowerBowlTrimSigma);
      radius+=(_wc.chinAmp??_wcc.chinAmp)*gaussAngle(th,_wcc.chinTheta,_wcc.chinSigma);
      radius+=(_wc.lobeAmp??_wcc.lobeAmp)*(gaussAngle(th,_wcc.leftLobeTheta,_wcc.lobeSigma)+gaussAngle(th,_wcc.rightLobeTheta,_wcc.lobeSigma));
      radius+=(_wc.rootAmp??_wcc.rootAmp)*(gaussAngle(th,_wcc.leftRootTheta,_wcc.rootSigma)+gaussAngle(th,_wcc.rightRootTheta,_wcc.rootSigma));
      radius-=(_wc.cleftDepth??_wcc.cleftDepth)*gaussAngle(th,_wcc.cleftTheta,_wcc.cleftSigma);
      // Identity ends here. The sole gait articulation pass is the downstream
      // posed-point block, after yaw/view deformation and before viscoelastic
      // integration. Keeping physGait out of this function prevents moving
      // Wispwalker from becoming a different hull than resting Wispwalker.
      // V2.2 NUB FEET/ARMS (D-0016 mass-continuous + non-defining): the nubs are the body's OWN
      // viscoelastic mass realizing the foot-root lobes + arm-mass — NOT bolt-on accessories and
      // NOT the identity token (the cleft + the walk define wispwalker). Additive gauss terms on
      // the existing silhouette keep the 512/360/672 topology lock and stay body-only (no facial
      // anatomy; feet at the bottom th~pi/2, arm nubs at the lower sides, well clear of the face
      // plane at the crown). footAmp deepens the load-bearing foot nubs (+ a slight splay); armAmp
      // raises stubby lower-side arm nubs. Live-sculptable via the turbo panel; the walk (V2.3)
      // shifts them side-to-side through asymEff so the loaded foot widens = mass transfer.
      // GASPER-009 C1 NUB READ: the nub feet/arms are now a scaffold displacement source
      // (nubScaffoldZ, on the same 25x40 grid as the relief pipe) read back through
      // scaffoldContourZ — the nubs ride the scaffold authority and deform with it instead
      // of a parallel hardcoded gauss path. footAmp/armAmp live-sculpt scaling is preserved
      // (it multiplies the scaffold read). The nubs are structural shape (non-zero at neutral,
      // time-independent => not perpetual motion). __nubGridReady is a hoisted var that stays
      // falsy until the scaffold grid consts below initialize, so this read is skipped during
      // early init (nubs sit at the base/lower-sides, clear of the face-anchor region).
      if(__nubGridReady){
        radius+=(_wc.footAmp??4)*scaffoldContourZ(nubScaffoldZ(profileId,'foot'),th);
        {const _armA=(_wc.armAmp??0); radius+=_armA*scaffoldContourZ(nubScaffoldZ(profileId,'arm'),th); radius+=_armA*(gaussAngle(th,0.70,0.19)+gaussAngle(th,2.44,0.19));}
      }
    }else if(profileId==='comet'){
      const _cc=(globalThis.__GASPER_LIVE_COEFFS__||{}).comet||{};radius-=(_cc.baseShift??2.4);
      radius+=(_cc.noseAmp??3.8)*gaussAngle(th,0,.52)-(_cc.tailAmp??1.2)*gaussAngle(th,Math.PI,.62);
      radius-=(_cc.topPinch??0.8)*gaussAngle(th,Math.PI/2,.28);
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
    // PRESSURE-COOKER CYCLE 11 (step-shape-phd-memo Z1/Z2/Z4) — the CONTACT FLATTEN: the support
    // read of the floor dialogue (the squash is the impulse read — no double-count). The kernel
    // DERIVES the patch (depth/width from the S0 support share, Hertz monotonic form); the renderer
    // EXPRESSES it on the base contour: a flat contact edge on the planted side (signed depth picks
    // the foot-root anchor — th 1.27 screen-x right / 1.87 screen-x left, the wispwalker lobe
    // angles, the bottom-side plant points for every profile) + two flank bulges that conserve the
    // displaced area exactly: bulge sigma = phi x patch sigma at +/-2.5 sigma, amplitude d/(2*phi)
    // => 2 x (d/(2*phi)) x (phi x sigma) = d x sigma (solid drawing — volume answers force). The
    // patch sigma = width_px / 72 (the ~72 px base radius, baseRadiusV63) so the width channel IS
    // the patch half-width in content px. Snapped at 0.004 px, then gated on live motion
    // (motion.value — the walkScaffoldZ idiom above): zero flatten => byte-identical contour
    // (Z4, D-0088). The numeric check leads the && chain ON PURPOSE: this function also runs at
    // init (createBaseContour / topology builds) where the motion dial is not bound yet — the
    // physGait carrier is exactly zero there, so the gate short-circuits before reading it.
    // CYCLE 12 (embodiment-silhouette-phd-memo W1/W2): the carrier now reaches EVERY family — the
    // singularity/dormant-orbit branches above fall through to it instead of returning early, so
    // the seed's silhouette expresses the same shape grammar the presence form does (the kernel
    // derives, the renderer expresses — one law, every embodiment).
    {const _gfd=gaitFlattenRadiusDelta(th);if(_gfd!==0)radius+=_gfd;}
    // S4 F-LAW 2 — the wind-resistance surface (trail-stretch / lead-compress):
    // the airflow's answer on the base contour, additive + gated like the
    // flatten above (kernel derives, renderer expresses — one law, every
    // embodiment; zero at rest / reduced motion => byte-identical).
    {const _wrd=windStretchRadiusDelta(th);if(_wrd!==0)radius+=_wrd;}
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
    // N78 COMPACT-SEED SILHOUETTE: the singularity endpoint is still a
    // compressed, horizon-led embodiment, but it must remain one living
    // shell. The prior endpoint (105 x 47.5/42.5 with sub-unit exponents)
    // widened the contour into a capsule before optics were even applied;
    // that made the internal gyre read as a replacement torus. Keep the
    // dormant-orbit endpoint byte-stable while tightening only the singularity
    // interpolation toward a rounded, compact gravitational seed.
    const width=lerp(79.5,82.0,c)*stableScale;
    const upperHeight=lerp(74.0,69.0,c)*stableScale;
    const lowerHeight=lerp(72.0,65.0,c)*stableScale;
    const xExponent=lerp(.96,.94,c),yExponent=lerp(.98,.94,c);
    const xNorm=signedPow(cos,xExponent),yNorm=signedPow(sin,yExponent);
    const sideIdentity=(gaussAngle(th,0,.16)+gaussAngle(th,Math.PI,.16))*lerp(4.15,3.15,c);
    const equatorEnvelope=Math.exp(-.5*Math.pow(sin/.31,2));
    const crownAsym=c*1.95*gaussAngle(th,-Math.PI/2,.72)-c*.72*gaussAngle(th,Math.PI/2,.72)+(1-c)*.9*gaussAngle(th,Math.PI/2,.85);
    const x=120+width*xNorm+Math.sign(cos||1)*sideIdentity*(.55+.45*equatorEnvelope);
    const y=111.5+(sin<0?upperHeight:lowerHeight)*yNorm-crownAsym;
    return{x,y,geometryModel:'dormant-family'};
  }
  function mapFormPoint(th,radius,profile=FORM_PROFILES[silhouetteProfile],profileId=silhouetteProfile){
    // CYCLE 12 W2 (embodiment-silhouette-phd-memo): the dormant-family mapper normalizes the live
    // radius by its own base — the normalization base must therefore be the ART base (the flatten
    // carrier subtracted back out), or the contact-flatten delta divides out of the radiusScale
    // quotient and the seed never reads the gait (the cycle-12 wall). The geometry model is read
    // from the PURE endpoint profile (sampleBodyForProfile builds each morph endpoint with its own
    // FORM_PROFILES entry), so the dormant branch runs only on the dormant endpoint; blendPointSets
    // then crossfades the two endpoint silhouettes by morphMix => the flatten contribution enters
    // and exits with the morph weight (W4: bounded silhouette delta, no pop at morph boundaries).
    // Every other geometry model keeps the exact prior denominator (byte-identical outside the
    // dormant family); at rest the carrier is exactly 0 => the dormant art is byte-identical (W1).
    const scale=radius/Math.max(.001,baseRadiusAtFor(profileId,th)-(profile.geometryModel==='dormant-family'?gaitFlattenRadiusDelta(th):0));
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

// GASPER-009 APERTURE ANCHOR SCAFFOLD RIDE (V4 mouth). The mouth anchor rides
// the Adaptive Shell Scaffold surface at its (u,v) coordinate using bilinear
// interpolation (ported from ScaffoldAttachment.ts attachApertureAnchorAt).
// At zero scaffold z the offset is exactly {0,0} (exact recovery — the mouth
// is byte-identical to its pre-migration position). A legibility clamp bounds
// the displacement to ±3px so the mouth never leaves the face region.
const _APERTURE_RINGS=25,_APERTURE_SECTORS=40;
const MOUTH_SCAFFOLD_U=0.5,MOUTH_SCAFFOLD_V=0.55;
const MOUTH_SCAFFOLD_GAIN=1.0;
const MOUTH_SCAFFOLD_CLAMP=3;
const _APERTURE_RING_OFFSET=0.72;
const _APERTURE_V_MIN=_APERTURE_RING_OFFSET/_APERTURE_RINGS;
const _APERTURE_V_MAX=(_APERTURE_RINGS-1+_APERTURE_RING_OFFSET)/_APERTURE_RINGS;
const _APERTURE_SNAP_EPS=1e-10;
function _apertureSnapToGrid(value){const nearest=Math.round(value);return Math.abs(value-nearest)<_APERTURE_SNAP_EPS?nearest:value;}
function _apertureClamp01(value){if(!Number.isFinite(value))return 0;return Math.max(0,Math.min(1,value));}
function scaffoldBilinearZ(scaffoldZ,u,v){
  if(!scaffoldZ||scaffoldZ.length!==_APERTURE_RINGS*_APERTURE_SECTORS)return 0;
  const uWrapped=((u%1)+1)%1;
  const sectorFloat=_apertureSnapToGrid(uWrapped*_APERTURE_SECTORS);
  const sFloor=Math.floor(sectorFloat);
  const sector0=((sFloor%_APERTURE_SECTORS)+_APERTURE_SECTORS)%_APERTURE_SECTORS;
  const sector1=(sector0+1)%_APERTURE_SECTORS;
  const s=_apertureClamp01(sectorFloat-sFloor);
  const vClamped=!Number.isFinite(v)?_APERTURE_V_MIN:Math.max(_APERTURE_V_MIN,Math.min(_APERTURE_V_MAX,v));
  const ringFloat=_apertureSnapToGrid(vClamped*_APERTURE_RINGS-_APERTURE_RING_OFFSET);
  const rFloor=Math.floor(ringFloat);
  const ring0=Math.max(0,Math.min(_APERTURE_RINGS-2,rFloor));
  const ring1=ring0+1;
  const t=_apertureClamp01(ringFloat-ring0);
  const z00=scaffoldZ[ring0*_APERTURE_SECTORS+sector0]||0;
  const z10=scaffoldZ[ring0*_APERTURE_SECTORS+sector1]||0;
  const z01=scaffoldZ[ring1*_APERTURE_SECTORS+sector0]||0;
  const z11=scaffoldZ[ring1*_APERTURE_SECTORS+sector1]||0;
  const top=z00+(z10-z00)*s;
  const bottom=z01+(z11-z01)*s;
  return top+(bottom-top)*t;
}
function scaffoldMouthOffset(scaffoldZ){
  if(!scaffoldZ||scaffoldZ.length!==_APERTURE_RINGS*_APERTURE_SECTORS)return{dx:0,dy:0};
  const surfaceDeltaZ=scaffoldBilinearZ(scaffoldZ,MOUTH_SCAFFOLD_U,MOUTH_SCAFFOLD_V);
  if(surfaceDeltaZ===0)return{dx:0,dy:0};
  const dy=Math.max(-MOUTH_SCAFFOLD_CLAMP,Math.min(MOUTH_SCAFFOLD_CLAMP,surfaceDeltaZ*MOUTH_SCAFFOLD_GAIN));
  return{dx:0,dy};
}
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
  const _mOff=scaffoldMouthOffset(globalThis.__GASPER_SCAFFOLD_Z__);
  if(profileId==='low-orbit')return Object.freeze({eyeL:createFaceSurfaceAnchorFor(profileId,91,124),eyeR:createFaceSurfaceAnchorFor(profileId,149,124),mouth:createFaceSurfaceAnchorFor(profileId,121+_mOff.dx,148+_mOff.dy)}); // D-0077: lower the low-orbit face plane further (eyes 118->124, mouth 144->148) so the eyes sit fully inside the flattened ground-tangent-puddle bodyClip with no top-edge clipping.
  if(profileId==='comet')return Object.freeze({eyeL:createFaceSurfaceAnchorFor(profileId,104,99),eyeR:createFaceSurfaceAnchorFor(profileId,163,100),mouth:createFaceSurfaceAnchorFor(profileId,134+_mOff.dx,137+_mOff.dy)});
  return Object.freeze({eyeL:createFaceSurfaceAnchorFor(profileId,84,99),eyeR:createFaceSurfaceAnchorFor(profileId,156,99),mouth:createFaceSurfaceAnchorFor(profileId,121+_mOff.dx,140+_mOff.dy)});
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

// GASPER-009 SCAFFOLD-TO-CONTOUR COUPLING: the 512-point contour samples the
// Adaptive Shell Scaffold's z-displacement at the outermost ring and modulates
// its radius. This is the "inside-out body cohesion" coupling — interior
// geometry drives exterior silhouette. The scaffold frame is published by the
// TypeScript authority (ScaffoldAttachment.ts) via globalThis.__GASPER_SCAFFOLD_Z__
// (a Float32Array of 1000 values, 25 rings × 40 sectors). The coupling reads
// the outermost ring (ring 24) and linearly interpolates between sectors.
// At zero displacement the coupling is exactly zero (no visible change).
// Gated by the scaffoldCoupling live-sculpt coefficient; absent override falls back to SCAFFOLD_COUPLING_DEFAULT (event-driven, zero at neutral).
const SCAFFOLD_RINGS=25,SCAFFOLD_SECTORS=40;
function scaffoldContourZ(scaffoldZ,th){
  if(!scaffoldZ||scaffoldZ.length!==SCAFFOLD_RINGS*SCAFFOLD_SECTORS)return 0;
  const u=(((th+Math.PI/2)/(2*Math.PI))%1+1)%1;
  const sf=u*SCAFFOLD_SECTORS;
  const s0=Math.floor(sf)%SCAFFOLD_SECTORS;
  const s1=(s0+1)%SCAFFOLD_SECTORS;
  const frac=sf-Math.floor(sf);
  const ring=SCAFFOLD_RINGS-1;
  const z0=scaffoldZ[ring*SCAFFOLD_SECTORS+s0]||0;
  const z1=scaffoldZ[ring*SCAFFOLD_SECTORS+s1]||0;
  return z0+(z1-z0)*frac;
}
// GASPER-009 LIVE RELIEF->SCAFFOLD PIPE (inside-out body cohesion, V3 keystone).
// The relief field is evaluated each frame onto this same 25x40 grid, but interior
// relief (brow/cheek/mouth, v~0.4-0.6) never reaches the rim on its own (measured:
// rim ring == 0 for every preset). So we project it OUTWARD: the rim ring's
// displacement[sector] = signed radial sum of interior pressure at that angle —
// interior expression pushes the outer shell. The published buffer IS the scaffold
// z-field consumed by scaffoldContourZ; interior rings keep the raw field for future
// aperture consumers. Calm states (relief 'none') and the goosebumps micro-texture
// publish an exact-zero rim (publishScaffoldRimZero), so the coupling is event-driven
// and off at neutral by construction. EXPERIMENTAL alive-by-default magnitude below;
// Cody ratifies the value (it is safe because the rim is exactly zero at neutral).
const SCAFFOLD_COUPLING_DEFAULT=0.5; // D-0077: reduce inside-out rim projection (2.0 -> 0.5) so interior relief no longer piles a liquid ripple/void onto the contour during transitions.
const __scaffoldZBuf=new Float32Array(SCAFFOLD_RINGS*SCAFFOLD_SECTORS);
// GASPER-009 C4 RIM-WEIGHTED RELIEF ENABLER (inside-out body cohesion; ellipse-retirement precondition).
// Interior relief (brow/cheek/mouth, v~0.4-0.6) must reach the rim to carry expression on the silhouette,
// but a plain radial sum can pile a grotesque pinch into one sector. rimWeightForRelief scales each ring's
// contribution by a smooth radial kernel that rises toward the rim (mid-face -> rim transfer); the per-sector
// sum is then clamped to RELIEF_RIM_CLAMP_PX so no single sector spikes. Interior rings keep their raw field;
// only the rim projection is weighted+clamped. EXPERIMENTAL -- Cody ratifies the magnitude and, separately,
// authorizes retiring the SVG ellipses (reliefEllipsesEnabled) only once this reads without pinching.
const RELIEF_RIM_CLAMP_PX=3.5; // EXPERIMENTAL (Cody ratifies): max |rim z| per sector; * SCAFFOLD_COUPLING_DEFAULT (2.0) => <=7px contour delta (< 8px no-pinch bound)
function rimWeightForRelief(ring,sector,preset){
  // Smooth radial kernel: ~0 deep inside, rising toward the rim ring. t maps ring 0..24 -> ~0.03..0.99.
  const t=(ring+0.72)/SCAFFOLD_RINGS,u=Math.min(1,Math.max(0,(t-0.3)/(0.9-0.3)));
  return u*u*(3-2*u); // smoothstep(0.3,0.9,t); the per-sector clamp is applied in scaffoldRimFromRelief
}
let reliefEllipsesEnabled=true; // EXPERIMENTAL (C4, Cody-gated): draw the SVG relief ellipses. Default ON; deletion authorized only by Cody's visual approval.
function scaffoldRimFromRelief(heights){
  const last=(SCAFFOLD_RINGS-1)*SCAFFOLD_SECTORS;
  for(let s=0;s<SCAFFOLD_SECTORS;s++){let sum=0;for(let ring=0;ring<SCAFFOLD_RINGS;ring++)sum+=(heights[ring*SCAFFOLD_SECTORS+s]||0)*rimWeightForRelief(ring,s,reliefPreset);if(sum>RELIEF_RIM_CLAMP_PX)sum=RELIEF_RIM_CLAMP_PX;else if(sum<-RELIEF_RIM_CLAMP_PX)sum=-RELIEF_RIM_CLAMP_PX;__scaffoldZBuf[last+s]=sum;}
  for(let i=0;i<last;i++)__scaffoldZBuf[i]=heights[i]||0;
  globalThis.__GASPER_SCAFFOLD_Z__=__scaffoldZBuf;
  return __scaffoldZBuf;
}
function publishScaffoldRimZero(){__scaffoldZBuf.fill(0);globalThis.__GASPER_SCAFFOLD_Z__=__scaffoldZBuf;}
// GASPER-009 C1 NUB SCAFFOLD SOURCE (start): wispwalker nub feet/arms as a scaffold
// displacement field on the SAME 25x40 Adaptive Shell Scaffold grid as the relief pipe
// (authority unification). The bumps live on the outermost ring (ring 24) at the sectors
// corresponding to the foot/arm contour angles; formRadiusAtFor reads them back through
// scaffoldContourZ, so the nubs ride the scaffold and deform with it. The contour angle th
// maps to scaffold u via u=(((th+PI/2)/(2PI))%1+1)%1 (identical to scaffoldContourZ), so a
// bump written at sector s is sampled exactly at th=(s/40)*2PI-PI/2 and linearly interpolated
// between sectors. The field is the old gauss-lobe sum sampled at the 40 sector angles =>
// piecewise-linear continuity with the prior hardcoded profile (measured max dev ~0.12 px).
// Wispwalker-gated: every other profile gets an exact-zero buffer. The nubs are STRUCTURAL
// shape (the body's own mass), non-zero at neutral by design and time-independent (NOT
// perpetual motion; only the C2 walk oscillator animates them). Relative lobe gains are baked
// in (foot splay 0.45); the live footAmp/armAmp amplitude stays in formRadiusAtFor.
var __nubGridReady=true; // hoisted var: undefined (falsy) until this statement runs, so the nub read in formRadiusAtFor stays off during early init (before the scaffold grid consts above initialize) and never trips their TDZ
const NUB_RING=SCAFFOLD_RINGS-1;
const NUB_FOOT_LOBES=Object.freeze([
  // G2 crisp-foot restoration: contour inertia damps the raster-sensitive
  // tip motion; the structural foot roots can use the pre-soften width.
  Object.freeze({th:1.27,sigma:0.13,gain:1.0}),
  Object.freeze({th:1.87,sigma:0.13,gain:1.0}),
  Object.freeze({th:1.10,sigma:0.285,gain:0.55}),
  Object.freeze({th:2.04,sigma:0.285,gain:0.55}),
]);
const NUB_ARM_LOBES=Object.freeze([
  Object.freeze({th:0.22,sigma:0.16,gain:1.0}),
  Object.freeze({th:2.92,sigma:0.16,gain:1.0}),
]);
var __nubFootZ=null,__nubArmZ=null,__nubAllZ=null; // read-only cached fields (only scaffoldContourZ reads them)
function buildNubField(lobes){
  const field=new Float32Array(SCAFFOLD_RINGS*SCAFFOLD_SECTORS);
  for(let s=0;s<SCAFFOLD_SECTORS;s++){
    const th=(s/SCAFFOLD_SECTORS)*2*Math.PI-Math.PI/2;
    let z=0;
    for(const lobe of lobes)z+=lobe.gain*gaussAngle(th,lobe.th,lobe.sigma);
    field[NUB_RING*SCAFFOLD_SECTORS+s]=z;
  }
  return field;
}
function nubScaffoldZ(profileId,group){
  if(profileId!=='wispwalker')return new Float32Array(SCAFFOLD_RINGS*SCAFFOLD_SECTORS);
  if(!__nubFootZ){
    __nubFootZ=buildNubField(NUB_FOOT_LOBES);
    __nubArmZ=buildNubField(NUB_ARM_LOBES);
    __nubAllZ=new Float32Array(SCAFFOLD_RINGS*SCAFFOLD_SECTORS);
    for(let i=0;i<__nubAllZ.length;i++)__nubAllZ[i]=__nubFootZ[i]+__nubArmZ[i];
  }
  if(group==='foot')return __nubFootZ;
  if(group==='arm')return __nubArmZ;
  return __nubAllZ;
}
// GASPER-009 C1 NUB SCAFFOLD SOURCE (end)
// GASPER-009 C2 WALK->SCAFFOLD MIGRATION: the wispwalker walk lateral mass
// transfer (asym + alternating footPress) re-expressed as an ASYMMETRIC ring-24
// z-displacement on the Adaptive Shell Scaffold, consumed by the contour through
// scaffoldContourZ — so the walk rides the same inside-out authority as the relief
// pipe instead of modulating contour radius directly. Same aperiodic, accented,
// directional 2-term step wave + incommensurate accent envelope (§7.1/§8.1 kept);
// still lateral-first with NO vertical bob — the rim field is forced ZERO-MEAN
// across sectors (pure left/right redistribution, never a uniform expansion).
// Wispwalker-gated + motion-gated: any other profile, or motion.value===0 (reduced
// motion / pause), returns an exact-zero buffer so the walk freezes. walkLean,
// walkPostX and the contrapposto stay pose-space transforms (not radius terms).
function walkScaffoldStep(rawStep){
  // Keep the performative fallback neutral at the authored phase origin. The
  // old half-frequency phase offset started with a positive root load before
  // the body had moved, which made a stopped Wispwalker look permanently
  // planted on one side.
  const neutralStep=0.18*Math.sin(1.7);
  const travelStep=physGait.speedRatio>0.01;
  return Math.max(-1,Math.min(1,rawStep-(travelStep?0:neutralStep)));
}
function walkSupportStep(authoredStep){
  // During real locomotion, let the visible scaffold follow the same planted
  // support conclusion that drives stepBase/flatten. The authored wave remains
  // the lawful in-place fallback; it never becomes a second physics writer.
  if(!(physGait.speedRatio>0.01))return authoredStep;
  const baseX=Number(physGait.stepBaseXUnits)||0,swayX=Math.abs(Number(physGait.swayXUnits)||0),flatten=Number(physGait.stepFlattenUnits)||0;
  if(Math.abs(baseX)>0.004&&swayX>0.004)return Math.max(-1,Math.min(1,baseX/swayX));
  if(Math.abs(flatten)>0.004)return Math.max(-1,Math.min(1,flatten/61.2));
  return Math.tanh(5.23606797749979*Math.cos(physGait.phase/2));
}
function walkPhysicsDrivenHold(){
  return worldPoseTarget.provenance==='physics-authority';
}
function walkScaffoldZ(profileId,st,t){
  const buf=new Float32Array(SCAFFOLD_RINGS*SCAFFOLD_SECTORS);
  const _wcW=(globalThis.__GASPER_LIVE_COEFFS__||{}).wispwalker||{};
  const wispW=profileId==="wispwalker"?1:0;
  const walkGate0=wispW*(Number(motion.value)>0.01?1:0)*(_wcW.walkEnable??1);
  const walkGate=walkGate0*(walkPhysicsDrivenHold()?0:1);
  if(!walkGate)return buf; // gated off -> exact zero (walk frozen under reduced motion / physics-owned holds / non-wispwalker profiles)
  const wAmp=_wcW.walkAmp??1.25,wPer=Math.max(0.4,_wcW.walkPeriod??1.25),wAcc=Math.min(1,Math.max(0,_wcW.walkAccent??0.6));
  // CYCLE 1 L8 (gait-expression-phd-memo) — a body WALKING under the kernel rides its
  // travel-locked step phase (distance-integrated, never a clock); the authored clock rhythm
  // survives only for the in-place performative walk when the physics gait is at rest.
  const stepPhase=physGait.speedRatio>0.01?physGait.phase:(t/wPer)*2*Math.PI;
  const authoredStep=walkScaffoldStep(Math.sin(stepPhase)*0.82+Math.sin(stepPhase*0.5+1.7)*0.18);
  const supportStep=walkSupportStep(authoredStep);
  const step=physGait.speedRatio>0.01?supportStep:authoredStep;
  const accent=0.5+0.5*Math.sin(t*0.31+0.4);
  const gate=(1-wAcc)+wAcc*Math.pow(accent,1+wAcc*2);
  const walkAsym=wAmp*step*gate*walkGate;
  const stepDepth=(_wcW.stepDepth??7.2);
  // NORTHSTAR S0 / CYCLE 5 — during real locomotion the planted foot is not
  // allowed to glide on the authored walk sine. The kernel already publishes
  // the world-locked plant (plantedScreenXUnits) plus the load carriers (stepBaseXUnits) and load-shaped
  // flatten carrier (stepFlattenUnits); use those carriers for the visible
  // root pressure so the planted side holds through stance and exchanges only
  // in the double-support window. When the screen projection is intentionally
  // zero (or for a performative walk-in-place), retain the authored phase as a
  // lawful fallback — the physics phase still remains the sole clock.
  const _moving=physGait.speedRatio>0.01;
  const _baseX=Number(physGait.stepBaseXUnits)||0,_swayX=Math.abs(Number(physGait.swayXUnits)||0),_flatten=Number(physGait.stepFlattenUnits)||0;
  // S0 fallback: a pure lateral world walk has no screen-x projection, but
  // the physical support side still plants and holds. Reuse the same
  // k=2φ² exchange sharpness as the kernel's planted-base law instead of
  // falling back to the old continuous walk sine (which reads as a glide).
  const _supportPhase=Math.cos(physGait.phase/2);const _supportFallback=Math.tanh(5.23606797749979*_supportPhase);
  let plantR=Math.max(0,supportStep),plantL=Math.max(0,-supportStep);
  if(_moving){
    const _baseShare=_swayX>0.004?Math.min(1,Math.abs(_baseX)/_swayX):0;
    const _flattenShare=Math.min(1,Math.abs(_flatten)/61.2);
    const _supportSigned=Math.abs(_baseShare)>0.004?_baseX:Math.abs(_flatten)>0.004?_flatten:_supportFallback;
    const _supportShare=Math.abs(_baseShare)>0.004?_baseShare:Math.abs(_flatten)>0.004?_flattenShare:Math.abs(_supportFallback);
    if(Math.abs(_supportSigned)>0.004&&_supportShare>0.004){
      const _loaded=Math.max(0.12,Math.min(1,_supportShare));const _free=Math.max(0,0.10*(1-_loaded));if(_supportSigned>0){plantR=_loaded;plantL=_free;}else{plantL=_loaded;plantR=_free;}
    }
  }
  const footPress=wAmp*gate*walkGate*stepDepth;
  const last=(SCAFFOLD_RINGS-1)*SCAFFOLD_SECTORS;let mean=0;
  for(let s=0;s<SCAFFOLD_SECTORS;s++){
    const th=(s/SCAFFOLD_SECTORS)*2*Math.PI-Math.PI/2;
    const asymShape=1.6*gaussAngle(th,0,0.42)-1.4*gaussAngle(th,Math.PI,0.42)+0.55*gaussAngle(th,-0.12,0.42)-0.42*gaussAngle(th,Math.PI+0.12,0.42);
    // Keep the center cleft out of the planted-root pressure carrier. The raw
    // paired-foot shape is physics-derived, but its broad lobes overlap at
    // theta=pi/2; removing that exact center sample preserves the support
    // exchange while preventing the load carrier from filling the cleft.
    const _yawF=typeof effectiveViewYaw==='function'?effectiveViewYaw():(typeof headingYawDeg==='number'?headingYawDeg:0);const _overlap=Math.abs(Math.sin(_yawF*Math.PI/180));const _half=0.30*(1-0.55*_overlap);const _thR=Math.PI/2-_half,_thL=Math.PI/2+_half;const _pC=Math.max(0,Math.min(1,Number(physGait.plantedCompress)||0));const _iC=Math.max(0,Math.min(1,Number(physGait.incomingCompress)||0));const _rightPlant=plantR>=plantL;const _pR=plantR*(1+(_rightPlant?0.90*_pC:-0.72*_iC));const _pL=plantL*(1+(_rightPlant?-0.72*_iC:0.90*_pC));const _sigR=0.26*(1+(_rightPlant?0.70*_pC:-0.42*_iC));const _sigL=0.26*(1+(_rightPlant?-0.42*_iC:0.70*_pC));
    const footShapeRaw=(_pR-0.45*_pL)*gaussAngle(th,_thR,_sigR)+(_pL-0.45*_pR)*gaussAngle(th,_thL,_sigL);
    const footCenter=(_pR-0.45*_pL)*gaussAngle(Math.PI/2,_thR,_sigR)+(_pL-0.45*_pR)*gaussAngle(Math.PI/2,_thL,_sigL);
    const footShape=footShapeRaw-footCenter*gaussAngle(th,Math.PI/2,0.20);
    const _clear=Math.max(0,Math.min(1,Number(physGait.swingClearance)||0));
    const z=walkAsym*0.55*asymShape+footPress*footShape*(1-0.28*_clear);
    buf[last+s]=z;mean+=z;
  }
  mean/=SCAFFOLD_SECTORS;for(let s=0;s<SCAFFOLD_SECTORS;s++)buf[last+s]-=mean; // zero-mean => purely asymmetric, no vertical bob (§7.1)
  return buf;
}
// GASPER-009 C5 SINGULARITY SCAFFOLD SOURCE (V6 dormant embodiment). The singularity's silhouette
// is authored as a scaffold z-displacement — the SAME geometry authority as the living body — rather
// than a detached contour path. It is a smooth, radially-symmetric "gravitational seed": a gentle
// INWARD compression (negative z) that deepens toward the center (ring 0) yet stays non-zero at the
// rim (ring 24) so the contour coupling (scaffoldContourZ, which samples the outermost ring) still
// reads it. Every sector of a ring shares one z => a smooth orb, not lumpy. Gated on singularityWeight>0
// AND profileId==='singularity' => presence/wispwalker/any other form get an exact-zero field (no leak).
// Static (no time term) => reduced-motion safe, no new perpetual motion. Magnitude is live-sculptable via
// __GASPER_LIVE_COEFFS__.singularity (seedDepth/seedRimFloor/seedCurve); EXPERIMENTAL defaults below —
// Cody ratifies the look (safe because the field is exactly zero off-singularity). Returns the shared
// seed buffer (snapshot via Float32Array.from if the value must be retained across calls).
const __singularityZBuf=new Float32Array(SCAFFOLD_RINGS*SCAFFOLD_SECTORS);
function singularityScaffoldZ(profileId,singularityWeight){
  const w=Math.max(0,Math.min(1,Number(singularityWeight)||0));
  if(profileId!=='singularity'||w<=0){__singularityZBuf.fill(0);return __singularityZBuf;}
  const _sc=(globalThis.__GASPER_LIVE_COEFFS__||{}).singularity||{};
  const depth=_sc.seedDepth??1.0,rimFloor=Math.max(0,Math.min(1,_sc.seedRimFloor??.42)),curve=_sc.seedCurve??1.35;
  for(let ring=0;ring<SCAFFOLD_RINGS;ring++){
    const t=ring/(SCAFFOLD_RINGS-1);
    const well=Math.pow(1-t,curve);
    const z=-depth*w*(rimFloor+(1-rimFloor)*well);
    const base=ring*SCAFFOLD_SECTORS;
    for(let sector=0;sector<SCAFFOLD_SECTORS;sector++)__singularityZBuf[base+sector]=z;
  }
  return __singularityZBuf;
}
function sampleBodyForProfile(profileId,st,t){
  const pts=[],c=Number(coupling.value),drift=Number(motion.value)*(st.motionGain??.72),profile=FORM_PROFILES[profileId],frame=formProjectionFrame(profile),volumeX=st.postureScaleX||1,volumeY=((globalThis.__GASPER_STANCE__||{}).live>0.004)?1:(st.postureScaleY||1);
  // V2.3 WISPWALKER WALK-IN-PLACE (D-0016; brief §3/§5 Layer A). An aperiodic, accented,
  // DIRECTIONAL root-to-root weight transfer layered on the seamless living loop (same render
  // clock t => additive by construction; never stops the loop). Gated on wispwalker + live motion
  // (motion.value is 0 under reduced motion / pause => walk freezes, satisfying §7.1 + §5.3) + the
  // walkEnable live-coeff. LATERAL-FIRST by design: asym transfer + lean-into-load + center drift
  // over the plant carry the step; there is NO per-step vertical sink, so the 2x "bob" signature
  // that §7.1 forbids cannot form, and no counter-phased head transform is needed (the face rides
  // only the ratified living torus). §8.1: no single master sine — the step is a 2-term asymmetric
  // wave and an incommensurate accent envelope yields longer "looking" holds so the walk reads as
  // intention, not a perpetual treadmill. §5.3: every term is C-inf in t (smooth glide, no snap).
  const _wcW=(globalThis.__GASPER_LIVE_COEFFS__||{}).wispwalker||{};
  const wispW=profileId==='wispwalker'?1:0;
  const walkGate0=wispW*(Number(motion.value)>0.01?1:0)*(_wcW.walkEnable??1);
  const walkGate=walkGate0*(walkPhysicsDrivenHold()?0:1);
  const wAmp=_wcW.walkAmp??1.25,wPer=Math.max(0.4,_wcW.walkPeriod??1.25),wAcc=Math.min(1,Math.max(0,_wcW.walkAccent??0.6));
  // CYCLE 1 L8 (gait-expression-phd-memo) — a body WALKING under the kernel rides its
  // travel-locked step phase (distance-integrated, never a clock); the authored clock rhythm
  // survives only for the in-place performative walk when the physics gait is at rest.
  const stepPhase=physGait.speedRatio>0.01?physGait.phase:(t/wPer)*2*Math.PI;
  const authoredStep=walkScaffoldStep(Math.sin(stepPhase)*0.82+Math.sin(stepPhase*0.5+1.7)*0.18);
  const supportStep=walkSupportStep(authoredStep);
  const step=physGait.speedRatio>0.01?supportStep:authoredStep;
  const accent=0.5+0.5*Math.sin(t*0.31+0.4);
  const gate=(1-wAcc)+wAcc*Math.pow(accent,1+wAcc*2);
  const walkAsym=0;
  const walkLean=0;
  const walkPostX=0;
  const walkPostY=0; // whole-pearl COM drop rides bobLiftUnits / idleRig, not a second contour sink
  // V2.5 WALK-STEP (D-0021): alternating root-to-root foot PRESSURE so the walk reads as a step, not a
  // unified sway. The prior walk drove asym/lean/postX all from ONE step sine, so the whole body rocked
  // in phase (= sway) and the two feet never differentiated. Here the planted foot EXTENDS (presses into
  // the ground) while the free foot EASES (mass flows to the plant), OUT OF PHASE between the two
  // foot-root lobes (th=1.27 right foot, th=1.87 left foot; consistent with the asym>0 => mass-shifts-right
  // contrapposto). Rectified ±step keeps the aperiodic 2-term wave (§8.1 no master sine); every term C-inf
  // (§5.3); still lateral-first, no vertical bob (§7.1). stepDepth = live-sculpt step pronouncedness.
  const stepDepth=(_wcW.stepDepth??7.2),plantR=Math.max(0,supportStep),plantL=Math.max(0,-supportStep),footPress=wAmp*gate*walkGate*stepDepth;
  const asymEff=(st.asym||0)+walkAsym,bodyLeanEff=(st.bodyLean||0)+walkLean,postXEff=(st.postureX||0)+walkPostX,postYEff=(st.postureY||0)+walkPostY,walkZ=walkScaffoldZ(profileId,st,t);
  const _tenStiff=FORM_TENSION.enabled?(1-FORM_TENSION.stiffen*Math.max(0,formTension+stateTension)):1; // D-0041 V3 Layer A: tension stiffens (damps) the autonomous drift micro -> reads as rigid-but-smooth containment; modulates an EXISTING aperiodic signal (no new periodic term, 7.1-safe); bounded [1-stiffen,1], smooth (formTension eased), reversible (enabled=false => 1)
  fvMaxAbs=0; // D-0066 SLICE A: reset the per-call measured max |variant radius delta| (the no-pinch tracker reported to telemetry)
  for(const vertex of BASE_CONTOUR){
    const {index,th,weights}=vertex;let r=formRadiusAtFor(profileId,th);
    const lower=weights.lower,sideR=weights.sideRight,sideL=weights.sideLeft,top=weights.crown;
    r+=(st.wide+stateWide)*(1.8*lower+1.0*(sideR+sideL));r+=(st.crown+stateCrown+stateBeat+statePop*EIGHT_STATE_POP.crownK)*1.6*top;r+=(st.low+stateLow)*(1.05*lower-0.40*top); // D-0049 M2: per-state body stance composed additive over the fixture crown/low/wide levers (stateBeat = M3 transient crown pulse)r+=(st.asym||0)*(1.6*sideR-1.4*sideL+0.55*gaussAngle(th,-0.12,0.42)-0.42*gaussAngle(th,Math.PI+0.12,0.42));
    if(EIGHT_STATE_FORM_VARIANT.enabled&&profileId==='presence'){const _fvG=((globalThis.__GASPER_LIVE_COEFFS__||{}).formVariant||{}).formVariantGain??1;if(_fvG!==0){let _fvR=fvCrown*top+fvLow*lower+fvWide*(sideR+sideL)+fvAsym*(sideR-sideL);const _fvP=EIGHT_STATE_FORM_VARIANT.pinch;_fvR=_fvR>_fvP?_fvP:(_fvR<-_fvP?-_fvP:_fvR);r+=_fvR;const _fvA=Math.abs(_fvR);if(_fvA>fvMaxAbs)fvMaxAbs=_fvA;}} // D-0066 SLICE A: per-state form-variant additive radius on the per-vertex weight basis, composed over the family formRadiusAtFor base + the D-0049 state deltas (composition order: family base -> state recipe -> FORM-VARIANT -> walk/scaffold -> whole-form _formK scale). Gated on presence family only (executing=comet / dormant=gyre keep their own unmistakable profiles) + live-coeff formVariantGain (gain 0 => skipped => BYTE-IDENTICAL). Hard-clamped to +/-pinch per vertex => no-pinch-safe by construction regardless of tuning (D-0059 clamp idiom). fv* already carry the _esMix/_esE ease + gate from the body block, so this is a pure read+clamp+add. Topology-safe (per-vertex radius modulation, no renumber); face-immutable (radius upstream of the face anchors; bumps at crown/base/sides clear of the face plane).
    r+=scaffoldContourZ(walkZ,th); // GASPER-009 C2: walk lateral mass transfer now rides the scaffold (asym + alternating foot press), zero-mean => no bob
    r-=c*(1.55*st.mouthCurve+1.20*st.mouthOpen)*weights.mouthCenter;r-=c*(1.30*st.pullR+0.65*st.mouthCurve)*weights.mouthRight;r-=c*(1.30*st.pullL+0.65*st.mouthCurve)*weights.mouthLeft;r+=c*(0.60*st.mouthCurve+0.42*st.mouthOpen)*(weights.cheekRight+weights.cheekLeft);
    r+=bodyRestGate*_tenStiff*(0.85*drift*Math.sin(t*0.74*(st.tempo||1)+th*2.0+(st.microSeed||1))+0.52*drift*Math.sin(t*0.38*(st.tempo||1)+th*3.5+1.2)+0.34*drift*Math.sin(t*0.27*(st.tempo||1)+th*5.0+2.6)); // V2.4 REST GATE (D-0018): freeze autonomous drift micro when settled
    // GASPER-009 SCAFFOLD COUPLING: inside-out body cohesion. The scaffold
    // z-displacement at this contour angle modulates the radius. Gated by
    // the scaffoldCoupling live-sculpt coefficient (default 0 = off).
    const _scaffoldZ=globalThis.__GASPER_SCAFFOLD_Z__;
    const _scaffoldK=((globalThis.__GASPER_LIVE_COEFFS__||{}).scaffold||{}).scaffoldCoupling??SCAFFOLD_COUPLING_DEFAULT;
    if(_scaffoldK>0&&_scaffoldZ)r+=_scaffoldK*scaffoldContourZ(_scaffoldZ,th);
    const mapped=mapFormPoint(th,r,profile,profileId),nx=mapped.x-frame.cx,ny=mapped.y-frame.cy,lean=bodyLeanEff*(1-Math.min(1,Math.abs(ny)/(frame.ry||80)));
    // WISPWALKER GROUNDED STANCE: a slow contrapposto weight-shift (asym-driven lateral
    // mass transfer) so the planted body reads as standing, not floating. Vertical
    // grounding is handled by the profile/sculpt + the regular contact shadow below.
    const wisp=profileId==='wispwalker'?1:0;
    const contrapposto=wisp*asymEff*4.2*(1-Math.min(1,Math.abs(ny)/(frame.ry||80)));
    const _expK=FORM_EXPANSION.enabled?(1+FORM_EXPANSION.amp*(formExpansion+stateExpansion+(RECOGNITION_POP.enabled?RECOGNITION_POP.lift*recognitionPop:0)+(EIGHT_STATE_POP.enabled?EIGHT_STATE_POP.expK*statePop:0))):1; // D-0040 V3 (C) whole-form expansion: uniform radial scale about center (body contour only; face plane untouched); bounded +/-2.5% (<< 8px no-pinch), identity at neutral family. + D-0041 V3 Layer A recognition MASS-pop: recognitionPop briefly swells the whole mass on recognitionCross (the whole being says "aha"), bounded lift, settles on RECOGNITION_POP.tau
    const _tenK=FORM_TENSION.enabled?(1-FORM_TENSION.amp*Math.max(0,formTension+stateTension)):1; // D-0041 V3 Layer A: tension -> slight whole-form contraction (rigid-but-smooth containment, memo §3 blocked); bounded -1.8% radius (~0.9px << 8px no-pinch), identity at neutral family, reversible (enabled=false => 1)
    const _formK=_expK*_tenK; // D-0041 V3 Layer A: composed whole-form scale (expansion o recognition-pop o tension); worst-case |delta| < 3.3% radius << 8px no-pinch
    const posed={x:frame.cx+nx*volumeX*_formK+postXEff+lean+contrapposto,y:frame.cy+ny*volumeY*_formK+postYEff+(((globalThis.__GASPER_STANCE__||{}).live>0.004)?0:physSilhouettePlantY)};
    if(profileId==='wispwalker'){
      const GN=globalThis.__GASPER_GEONODES_EVAL__||{};
      if(!(GN.mute&&GN.mute.handles)){
      const S=globalThis.__GASPER_STANCE__||{};
      if((S.live||0)>0.004&&S.left&&S.right&&S.crotch){
        const _chinKeep=gaussAngle(th,Math.PI/2,0.18);
        const _lower=Math.min(1,Math.max(0,Math.sin(th)-0.20)/0.80);
        const wL=gaussAngle(th,1.83,0.11)*(1-_chinKeep)*_lower;
        const wR=gaussAngle(th,1.31,0.11)*(1-_chinKeep)*_lower;
        const wC=gaussAngle(th,Math.PI/2,0.09)*(1-_chinKeep)*_lower;
        posed.x+=(S.left.x-100)*wL+(S.right.x-140)*wR+(S.crotch.x-120)*wC;
        posed.y+=(S.left.y-188)*wL+(S.right.y-188)*wR+(S.crotch.y-172)*wC;
      }
      }
    }
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
    if(effectiveViewYaw()===0)return{...source,latentDepth:source.expressionDepth||0,projectedDepth:0}; // S5: the early-out reads the COMPOSED yaw so attention turn deforms the mesh too (dial-only at 0 => unchanged)
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
  // PERSONALITY Q2 (Cody visual): specular eye-spark nodes -- light glints on the
  // almond aperture, NOT drawn anatomical sub-elements (the face stays the 3-part
  // rig). Appended as the last children of each eye's parent group so they paint on
  // top of the core/bloom/shadow triplet and inherit the same body/face transforms.
  function makeEyeSpark(parent){const c=document.createElementNS(NS,'circle');c.setAttribute('fill','#ffffff');c.setAttribute('pointer-events','none');c.setAttribute('data-eye-spark','1');c.setAttribute('r','0');c.setAttribute('opacity','0');parent.appendChild(c);return c;}
  const eyeSparkL=makeEyeSpark(eyeL.parentNode),eyeSparkL2=makeEyeSpark(eyeL.parentNode),eyeSparkR=makeEyeSpark(eyeR.parentNode),eyeSparkR2=makeEyeSpark(eyeR.parentNode);
  // D-0110: pupil/iris anatomy RETRACTED by owner order — Gasper's face grammar is
  // pupil-less by ratified character design; never to be re-added without explicit
  // owner approval (the eyeSpark specular glints remain the only eye additions).
  // Cursor-reactive bounded gaze: the pointer eases toward a CLAMPED look target as an
  // additive bias on the authored aperiodic gaze (the living-loop glances are never
  // replaced). Gated by motionStrength in the render loop so it freezes under reduced
  // motion / pause. Coexists with the vertex-drag handler (which owns the pointer while
  // a vertex is grabbed). pointerleave releases the look back to center via decay.
  avatar.addEventListener('pointermove',function(evQ2){if((selectedVertex>=0||selectedGrid>=0)&&dragOrigin)return;try{const p=eventPoint(evQ2);if(!isFinite(p.x)||!isFinite(p.y))return;const dx=p.x-120,dy=p.y-102;pointerGazeTX=Math.max(-4.2,Math.min(4.2,dx*0.05));pointerGazeTY=Math.max(-3.0,Math.min(3.0,dy*0.05));pointerGazeActive=1;pointerGazeLastMove=performance.now();}catch(_eQ2){}});
  avatar.addEventListener('pointerleave',function(){pointerGazeTX=0;pointerGazeTY=0;});
  function skinPoint(event){
    const host=stepRig||idleRig||avatar;
    const p=avatar.createSVGPoint();
    p.x=event.clientX;p.y=event.clientY;
    const m=host.getScreenCTM();
    if(!m)return eventPoint(event);
    return p.matrixTransform(m.inverse());
  }
  function stampGridSculpt(index,dx,dy,snap){
    const R=25,S=40,r0=Math.floor(index/S),s0=index%S;
    for(let r=0;r<R;r++){
      for(let s=0;s<S;s++){
        let ds=Math.abs(s-s0);if(ds>S/2)ds=S-ds;
        const w=Math.exp(-0.5*Math.pow(Math.hypot((r-r0)*0.85,ds)/2.6,2));
        if(w<0.02)continue;
        const j=r*S+s;
        gridSculpt[j*2]=(snap[j*2]||0)+dx*w;
        gridSculpt[j*2+1]=(snap[j*2+1]||0)+dy*w;
      }
    }
  }
  avatar.style.pointerEvents='auto';
  const skinRoot=avatar.closest('[data-testid="gasper-dais"]')||avatar;
  const onSkinDown=event=>{
    if(event.button!=null&&event.button!==0)return;
    const p=skinPoint(event);
    if(globalThis.__GASPER_SHOW_GRID__!==false&&globalThis.__GASPER_GRID_XYZ__){
      const xyz=globalThis.__GASPER_GRID_XYZ__,cx=Number(globalThis.__GASPER_GRID_CX__),cy=Number(globalThis.__GASPER_GRID_CY__);
      let best=-1,bestD=18;
      for(let i=0;i<1000;i++){
        const d=Math.hypot(cx+(xyz[i*3]||0)-p.x,cy+(xyz[i*3+1]||0)-p.y);
        if(d<bestD){bestD=d;best=i;}
      }
      if(best>=0){
        selectedGrid=best;
        dragOrigin={pointer:p,snap:new Float32Array(gridSculpt)};
        if(skinRoot.setPointerCapture) skinRoot.setPointerCapture(event.pointerId);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    if(!debugOn||!lastMeshPoints.length)return;
    let best=-1,bestDistance=Infinity;
    for(const vertex of lastMeshPoints){const distance=Math.hypot(vertex.x-p.x,vertex.y-p.y);if(distance<bestDistance){bestDistance=distance;best=vertex.index;}}
    if(bestDistance>8)return;selectedVertex=best;dragOrigin={pointer:p,offset:{...meshOffsets[best]}};if(skinRoot.setPointerCapture)skinRoot.setPointerCapture(event.pointerId);event.preventDefault();
  };
  const onSkinMove=event=>{
    if(selectedGrid>=0&&dragOrigin&&dragOrigin.snap){
      const p=skinPoint(event);
      stampGridSculpt(selectedGrid,p.x-dragOrigin.pointer.x,p.y-dragOrigin.pointer.y,dragOrigin.snap);
      event.preventDefault();
      return;
    }
    if(selectedVertex<0||!dragOrigin)return;const p=eventPoint(event);meshOffsets[selectedVertex].x=dragOrigin.offset.x+p.x-dragOrigin.pointer.x;meshOffsets[selectedVertex].y=dragOrigin.offset.y+p.y-dragOrigin.pointer.y;
  };
  function endDrag(event){
    if(selectedGrid>=0){
      const snap=dragOrigin&&dragOrigin.snap;
      let changed=false;
      if(snap){
        for(let i=0;i<gridSculpt.length;i++) if((gridSculpt[i]||0)!==(snap[i]||0)){changed=true;break;}
      }
      selectedGrid=-1;dragOrigin=null;
      if(skinRoot.hasPointerCapture&&skinRoot.hasPointerCapture(event.pointerId))skinRoot.releasePointerCapture(event.pointerId);
      if(changed){
        try{window.dispatchEvent(new CustomEvent('gasper:sculpt-commit',{detail:{before:Array.from(snap)}}));}catch(_e){}
      }
      return;
    }
    if(selectedVertex<0)return;selectedVertex=-1;dragOrigin=null;if(skinRoot.hasPointerCapture&&skinRoot.hasPointerCapture(event.pointerId))skinRoot.releasePointerCapture(event.pointerId);
  }
  skinRoot.addEventListener('pointerdown',onSkinDown,true);
  skinRoot.addEventListener('pointermove',onSkinMove,true);
  skinRoot.addEventListener('pointerup',endDrag,true);
  skinRoot.addEventListener('pointercancel',endDrag,true);

  function computeNormals(pts){const out=[];for(let i=0;i<pts.length;i++){const p=pts[i],p0=pts[(i-1+pts.length)%pts.length],p2=pts[(i+1)%pts.length];let nx=p2.y-p0.y,ny=-(p2.x-p0.x);const len=Math.hypot(nx,ny)||1;nx/=len;ny/=len;if(nx*(p.x-120)+ny*(p.y-110)<0){nx=-nx;ny=-ny;}out.push({x:nx,y:ny});}return out;}
  function angleToIndex(angle,n=CONTOUR_SAMPLES){const start=1.5*Math.PI,a=((angle%(2*Math.PI))+2*Math.PI)%(2*Math.PI),delta=(a-start+2*Math.PI)%(2*Math.PI);return Math.round(delta/(2*Math.PI)*n)%n;}
  function ribbonFromAnchors(pts,normals,anchors,lightDir,offsetBase,offsetGain,widthBase,widthGain){const outer=[],inner=[];for(let j=0;j<anchors.length;j++){const idx=angleToIndex(anchors[j],pts.length),p=pts[idx],n=normals[idx];let q=Math.max(0,n.x*lightDir[0]+n.y*lightDir[1]);q=smoothstep(0.18,0.96,q);const env=Math.pow(Math.sin(Math.PI*(j/Math.max(1,anchors.length-1))),0.9),off=offsetBase+offsetGain*(0.20+0.80*q),w=(widthBase+widthGain*q)*env;outer.push({x:p.x-n.x*(off-w*.5),y:p.y-n.y*(off-w*.5)});inner.push({x:p.x-n.x*(off+w*.5),y:p.y-n.y*(off+w*.5)});}return{outer,inner};}
  function ribbonPath(outer,inner){if(!outer.length||!inner.length)return'';const rev=[...inner].reverse();return`M ${outer[0].x.toFixed(2)} ${outer[0].y.toFixed(2)}`+splineSegments(outer)+` L ${rev[0].x.toFixed(2)} ${rev[0].y.toFixed(2)}`+splineSegments(rev)+' Z';}
  function centerlineFromAnchors(pts,normals,anchors,lightDir,insetBase,insetGain){const out=[];for(let j=0;j<anchors.length;j++){const idx=angleToIndex(anchors[j],pts.length),p=pts[idx],n=normals[idx];let q=Math.max(0,n.x*lightDir[0]+n.y*lightDir[1]);q=smoothstep(0.18,0.96,q);const env=Math.pow(Math.sin(Math.PI*(j/Math.max(1,anchors.length-1))),0.9),off=insetBase+insetGain*(0.25+0.75*q)*(0.55+0.45*env);out.push({x:p.x-n.x*off,y:p.y-n.y*off});}return out;}
  function eyePath(cx,cy,width,openv,tilt){const ap=1.8+openv*14.4,left=rotate(cx-width/2,cy,cx,cy,tilt),right=rotate(cx+width/2,cy,cx,cy,tilt),c1=rotate(cx-width*.24,cy-ap*1.48,cx,cy,tilt),c2=rotate(cx+width*.24,cy-ap*1.48,cx,cy,tilt),c3=rotate(cx+width*.26,cy+ap*1.0,cx,cy,tilt),c4=rotate(cx-width*.26,cy+ap*1.0,cx,cy,tilt);return`M ${left.x.toFixed(2)} ${left.y.toFixed(2)} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${right.x.toFixed(2)} ${right.y.toFixed(2)} C ${c3.x.toFixed(2)} ${c3.y.toFixed(2)} ${c4.x.toFixed(2)} ${c4.y.toFixed(2)} ${left.x.toFixed(2)} ${left.y.toFixed(2)} Z`;}
  function mouthPath(st){const a=st.pullR-st.pullL,skew=st.mouthSkew||0,pinch=st.mouthPinch||0,round=st.mouthRound||0,open=Math.max(0,st.mouthOpen||0),curve=st.mouthCurve||0,cx=121+a*2.6+skew*4.2,cy=140-(st.mouthLift||0)*8-curve*1.4,w=(14.5+st.mouthWidth*25)*(1-round*.16),rnd=Math.max(round,Math.min(.62,open*.72)),ap=(1.7+open*12)*(1+rnd*.30)*(1-pinch*.18),mass=1.4+Math.max(0,curve)*2.4+open*1.3,cornerLift=curve*6.6,leftY=cy-cornerLift-st.pullL*4.4+skew*1.2,rightY=cy-cornerLift-st.pullR*4.4-skew*1.2,left={x:cx-w/2,y:leftY},right={x:cx+w/2,y:rightY},top={x:cx+a*1.5+skew*1.4,y:cy-ap*.82-curve*.7+pinch*.9},bottom={x:cx+a*1.2+skew*.8,y:cy+ap*.82+mass+curve*2.1-pinch*.45},hx=w*(.30+rnd*.14);return`M ${left.x.toFixed(2)} ${left.y.toFixed(2)} C ${(cx-hx).toFixed(2)} ${top.y.toFixed(2)} ${(cx-w*.10).toFixed(2)} ${top.y.toFixed(2)} ${top.x.toFixed(2)} ${top.y.toFixed(2)} C ${(cx+w*.10).toFixed(2)} ${top.y.toFixed(2)} ${(cx+hx).toFixed(2)} ${top.y.toFixed(2)} ${right.x.toFixed(2)} ${right.y.toFixed(2)} C ${(cx+hx).toFixed(2)} ${bottom.y.toFixed(2)} ${(cx+w*.09).toFixed(2)} ${bottom.y.toFixed(2)} ${bottom.x.toFixed(2)} ${bottom.y.toFixed(2)} C ${(cx-w*.09).toFixed(2)} ${bottom.y.toFixed(2)} ${(cx-hx).toFixed(2)} ${bottom.y.toFixed(2)} ${left.x.toFixed(2)} ${left.y.toFixed(2)} Z`;}
  function setTriplet(core,bloom,shadow,d,dy=.9,offset={x:0,y:0},scaleX=1,extras={}){
    // VEC-302: optional bloomOuter / halo / shadowOuter companions replace faceGlow/specularGlow/shadowBlur filters
    const x=offset.x.toFixed(3),y=offset.y.toFixed(3);
    const scale=scaleX===1?'':` translate(121 0) scale(${scaleX.toFixed(3)} 1) translate(-121 0)`;
    const bloomK=typeof extras.bloomScale==='number'&&Number.isFinite(extras.bloomScale)?Math.max(1,Math.min(1.38,extras.bloomScale)):1.38;
    const outerSx=(scaleX===1?bloomK:scaleX*bloomK).toFixed(3);
    const outerScale=` translate(121 0) scale(${outerSx} ${bloomK.toFixed(3)}) translate(-121 0)`;
    const tCore=`translate(${x} ${y})${scale}`,tShadow=`translate(${x} ${(offset.y+dy).toFixed(3)})${scale}`;
    core.setAttribute('d',d);bloom.setAttribute('d',d);shadow.setAttribute('d',d);
    core.setAttribute('transform',tCore);bloom.setAttribute('transform',tCore);shadow.setAttribute('transform',tShadow);
    if(extras.halo){extras.halo.setAttribute('d',d);extras.halo.setAttribute('transform',tCore);}
    if(extras.bloomOuter){extras.bloomOuter.setAttribute('d',d);extras.bloomOuter.setAttribute('transform',`translate(${x} ${y})${outerScale}`);}
    if(extras.shadowOuter){extras.shadowOuter.setAttribute('d',d);extras.shadowOuter.setAttribute('transform',`translate(${x} ${(offset.y+dy*1.15).toFixed(3)})${scale}`);}
  }

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
    // D-0026: brow-tension strokes REMOVED — the "thin white lines above the eyes" Cody flagged. The face is the
    // 3-part rig ONLY (core+bloom+shadow); a literal brow LINE read as drawn facial anatomy, which the no-anatomy
    // face rule forbids. Brow TENSION (the knit/gather feeling) still lives in the relief system as FIELDS
    // (RELIEF_PRESETS brow_raise/brow_knit + the browOpacity shell-brightness below), never as a drawn line.
    const cheekLD=quadraticStroke(lx-lw*.36,my+4,lx-lw*.58,my+8+(st.cheekL||0)*2,lx-lw*.72,my+13);
    const cheekRD=quadraticStroke(rx+rw*.36,my+4,rx+rw*.58,my+8+(st.cheekR||0)*2,rx+rw*.72,my+13);
    const mouthTD=quadraticStroke(faceProjection.mouth.x-21+mouthOffset.x,my-8,faceProjection.mouth.x+mouthOffset.x+((st.mouthSkew||0)*3),my-11-(st.mouthCurve||0)*2,faceProjection.mouth.x+21+mouthOffset.x,my-8);
    const troughLD=quadraticStroke(lx-lw*.42,ly+4,lx,ly+7+tension*2,lx+lw*.42,ly+4);
    const troughRD=quadraticStroke(rx-rw*.42,ry+4,rx,ry+7+tension*2,rx+rw*.42,ry+4);
    const troughMD=quadraticStroke(faceProjection.mouth.x-18+mouthOffset.x,my+6,faceProjection.mouth.x+mouthOffset.x,my+9+tension*2,faceProjection.mouth.x+18+mouthOffset.x,my+6);
    cheekTensionL.setAttribute('d',cheekLD);cheekTensionR.setAttribute('d',cheekRD);mouthTension.setAttribute('d',mouthTD);
    if(cheekTensionLOuter)cheekTensionLOuter.setAttribute('d',cheekLD);if(cheekTensionROuter)cheekTensionROuter.setAttribute('d',cheekRD);if(mouthTensionOuter)mouthTensionOuter.setAttribute('d',mouthTD);
    eyeTroughL.setAttribute('d',troughLD);eyeTroughR.setAttribute('d',troughRD);mouthTrough.setAttribute('d',troughMD);
    if(eyeTroughLOuter)eyeTroughLOuter.setAttribute('d',troughLD);if(eyeTroughROuter)eyeTroughROuter.setAttribute('d',troughRD);if(mouthTroughOuter)mouthTroughOuter.setAttribute('d',troughMD);
    expressionShellLayer.setAttribute('opacity',(visibility*Math.max(.08,browOpacity,cheekOpacity,mouthOpacity)).toFixed(3));expressionOcclusionLayer.setAttribute('opacity',(visibility*(.16+tension*.30)).toFixed(3));cheekTensionL.setAttribute('opacity',(Math.max(.02,Math.abs(st.cheekL||0)*.64)).toFixed(3));cheekTensionR.setAttribute('opacity',(Math.max(.02,Math.abs(st.cheekR||0)*.64)).toFixed(3));mouthTension.setAttribute('opacity',mouthOpacity.toFixed(3));
  }
  function ellipseSubpath(x,y,rx,ry){return`M ${(x-rx).toFixed(2)} ${y.toFixed(2)} a ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(rx*2).toFixed(2)} 0 a ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(-rx*2).toFixed(2)} 0 Z`;}
  function usesHighDetail(){return detailTier==='high'||reliefPreset!=='none';} // D-0074: presets render regardless of preview size (the adaptive gate was silencing the goosebump system at app scale).
  const isGoose=(p)=>p==='goosebumps'||p==='goosebumps_soft';
  // P0 DIRECT BAS-RELIEF RENDERER (replaces the per-vertex ellipse stipple).
  // The 1000-point relief field is evaluated once, then each polar grid cell is fit to a surface
  // plane from its four screen-mapped corners + their heights. The plane's SCREEN-SPACE normal is
  // Lambert-shaded against a single fixed world-space key light; light-facing cells fill the
  // highlight path, away-facing cells fill the shadow path. The existing heavy blur + screen/multiply
  // blend melts the quads into an organic shaded surface (true bas-relief), and the footprint grows
  // with slope so steeper relief reads brighter. This is normal-driven (not threshold-stippled), so it
  // renders wherever the field varies, and it is the foundation the P2 physical-light model builds on.
  // Intensity-only: it reuses the element's authored #bfa8ed / #03010b fills (NO new hue, D-0033) and
  // writes only d/opacity/layer-opacity plus soft companion paths (VEC-302 pure vector; no SVG filters).
  // It lives entirely OUTSIDE the guarded face block (eyePath..renderExpressionShell) => FACE_GEOMETRY_SHA
  // unchanged by construction. Reversible: BAS_RELIEF.enabled=false OR the reliefEllipsesEnabled A/B gate
  // off => cleared paths + hidden layer.
  const BAS_RELIEF=Object.freeze({enabled:true,light:Object.freeze({x:-0.62,y:-0.72,z:0.34}),heightScale:8.0,heightScaleGoose:4.0,slopeFloor:0.01,fieldFloor:0.08,expand:0.5,radialInner:0.16,radialOuter:0.96}); // D-0081/D-0085: retain micro-relief slope response but cull low-amplitude analytic tails before they become body-wide quads.
  let reliefAmplitudeLive=1; // D-0084: live relief-intensity multiplier fed by the dais Relief slider (relief_amplitude pose channel, consumed in applySemanticPose); 1 = authored D-0081 scales, 0 = flat.
  const CANONICAL_FIELD_PACKET='GASPER-UNIFIED-FIELD-001';
  let canonicalProductionField={active:false,version:'1',packet:CANONICAL_FIELD_PACKET,revision:0,sourceHash:'bootstrap',domains:{}};
  const CANONICAL_MATERIAL_DEFAULTS=Object.freeze({keyIntensity:.58,keyDirection:0,rim:.62,pearl:.72,absorption:.18,clearcoat:.42,texture:.56,roughness:.35,normalStrength:.58,curvatureResponse:.48});
  let canonicalMaterialResponse={...CANONICAL_MATERIAL_DEFAULTS,sourceRevision:0};
  let pressureMaterialResponse={packet:'GASPER-VEC-401',pressure:0,shellCompliance:0,reliefGain:0,materialCoupling:0,phase:0,hash:'bootstrap',sourceHash:'bootstrap',revision:0};
  function canonicalMaterialResponseFrom(domains){
    const material=domains&&domains.material&&typeof domains.material==='object'?domains.material:{};
    const read=(key,fallback)=>Number.isFinite(material[key])?Number(material[key]):fallback;
    return{
      keyIntensity:Math.max(0,Math.min(1.5,read('key_intensity',CANONICAL_MATERIAL_DEFAULTS.keyIntensity))),
      keyDirection:Math.max(-1,Math.min(1,read('key_direction',CANONICAL_MATERIAL_DEFAULTS.keyDirection))),
      rim:Math.max(0,Math.min(1.5,read('rim',CANONICAL_MATERIAL_DEFAULTS.rim))),
      pearl:Math.max(0,Math.min(1.5,read('pearl',CANONICAL_MATERIAL_DEFAULTS.pearl))),
      absorption:Math.max(0,Math.min(1,read('absorption',CANONICAL_MATERIAL_DEFAULTS.absorption))),
      clearcoat:Math.max(0,Math.min(1.5,read('clearcoat',CANONICAL_MATERIAL_DEFAULTS.clearcoat))),
      texture:Math.max(0,Math.min(1.5,read('texture',CANONICAL_MATERIAL_DEFAULTS.texture))),
      roughness:Math.max(0,Math.min(1,read('roughness',CANONICAL_MATERIAL_DEFAULTS.roughness))),
      normalStrength:Math.max(0,Math.min(1.5,read('normal_strength',CANONICAL_MATERIAL_DEFAULTS.normalStrength))),
      curvatureResponse:Math.max(0,Math.min(1.5,read('curvature_response',CANONICAL_MATERIAL_DEFAULTS.curvatureResponse))),
      sourceRevision:canonicalProductionField.revision,
    };
  }
  function applyCanonicalProjection(packet){
    if(!packet||packet.packet!==CANONICAL_FIELD_PACKET||packet.version!=='1')throw new TypeError('invalid canonical production field packet');
    const domains=packet.domains&&typeof packet.domains==='object'?packet.domains:{};
    canonicalProductionField={active:true,version:'1',packet:CANONICAL_FIELD_PACKET,revision:Math.max(0,Number(packet.revision)||0),sourceHash:String(packet.sourceHash||''),domains};
    canonicalMaterialResponse=canonicalMaterialResponseFrom(domains);
    const relief=domains.relief||{};
    if(Number.isFinite(relief.relief_amplitude))reliefAmplitudeLive=Math.max(0,Math.min(2.5,relief.relief_amplitude/0.45));
    avatar.dataset.canonicalFieldPacket=CANONICAL_FIELD_PACKET;
    avatar.dataset.canonicalFieldRevision=String(canonicalProductionField.revision);
    avatar.dataset.canonicalFieldHash=canonicalProductionField.sourceHash;
  }
  function unifiedProductionDynamics(){
    const d=canonicalProductionField.domains&&canonicalProductionField.domains.dynamics;
    if(!canonicalProductionField.active||!d||!Number.isFinite(Number(d.unified_time_seconds)))return null;
    const read=(key,fallback=0)=>Number.isFinite(Number(d[key]))?Number(d[key]):fallback;
    const frame={
      timeSeconds:Math.max(0,read('unified_time_seconds')),
      breath:Math.max(-.03,Math.min(.03,read('unified_breath'))),
      breathPhase:Math.max(0,Math.min(1,read('unified_breath_phase'))),
      wander:Math.max(-1,Math.min(1,read('unified_wander'))),
      springX:Math.max(-.025,Math.min(.025,read('unified_spring_x'))),
      springY:Math.max(-.018,Math.min(.018,read('unified_spring_y'))),
      springTheta:Math.max(-.014,Math.min(.014,read('unified_spring_theta'))),
      energyPulse:Math.max(-.05,Math.min(.05,read('unified_energy_pulse'))),
      reliefDrift:Math.max(-.04,Math.min(.04,read('unified_relief_drift'))),
      microTremor:Math.max(-.005,Math.min(.005,read('unified_micro_tremor'))),
      anticipation:Math.max(-.4,Math.min(.4,read('unified_anticipation'))),
      volumeScaleX:Math.max(.35,Math.min(1.65,read('unified_volume_scale_x',1))),
      volumeScaleY:Math.max(.35,Math.min(1.65,read('unified_volume_scale_y',1))),
      volumeProduct:read('unified_volume_product',1),
    };
    avatar.dataset.unifiedRenderAuthority='canonical-field';
    avatar.dataset.unifiedRenderTime=frame.timeSeconds.toFixed(4);
    avatar.dataset.unifiedRenderWander=frame.wander.toFixed(4);
    avatar.dataset.unifiedRenderVolumeProduct=frame.volumeProduct.toFixed(6);
    return frame;
  }
  function canonicalUnifiedLightFrame(dynamics){
    if(!dynamics||!canonicalProductionField.active)return null;
    const material=canonicalMaterialResponse;
    const energyDomain=canonicalProductionField.domains.energy||{};
    const energy=Number.isFinite(Number(energyDomain.energy_level))?Math.max(0,Math.min(1.25,Number(energyDomain.energy_level))):.72;
    const pressure=Math.max(0,Math.min(1,Number(pressureMaterialResponse.materialCoupling)||0));
    const roughnessResponse=1-.18*material.roughness;
    const key=Math.max(.72,Math.min(1.28,(.80+.20*material.keyIntensity+.08*material.clearcoat)*roughnessResponse));
    const interior=Math.max(.76,Math.min(1.20,(.78+.16*energy+.08*material.keyIntensity+.06*material.pearl+.05*pressure+.04*dynamics.energyPulse/.05)*roughnessResponse));
    const rim=Math.max(.76,Math.min(1.22,.80+.16*material.rim+.08*material.normalStrength+.04*dynamics.wander));
    const crown=Math.max(.76,Math.min(1.22,.82+.12*material.keyIntensity+.08*material.clearcoat+.04*dynamics.breath/.03));
    const lobe=Math.max(.76,Math.min(1.22,.84+.10*material.rim+.06*material.pearl+.04*dynamics.wander));
    const frame=Object.freeze({packet:'GASPER-UNIFIED-LIGHT-001',revision:canonicalProductionField.revision,key,intensity:interior,interior,rim,crown,lobe,roughness:material.roughness,roughnessResponse,volumeProduct:dynamics.volumeProduct});
    avatar.dataset.unifiedLightPacket=frame.packet;
    avatar.dataset.unifiedLightRevision=String(frame.revision);
    avatar.dataset.unifiedLightInterior=frame.interior.toFixed(6);
    avatar.dataset.unifiedLightRim=frame.rim.toFixed(6);
    avatar.dataset.unifiedLightCrown=frame.crown.toFixed(6);
    avatar.dataset.unifiedLightLobe=frame.lobe.toFixed(6);
    avatar.dataset.unifiedLightRoughness=frame.roughness.toFixed(6);
    avatar.dataset.unifiedLightRoughnessResponse=frame.roughnessResponse.toFixed(6);
    globalThis.__GASPER_UNIFIED_LIGHT_PROJECTION__=frame;
    return frame;
  }
  function evaluatePressureMaterialResponse(frame){
    const bridge=globalThis.__GASPER_PRESSURE_MATERIAL__;
    if(!bridge||bridge.packet!=='GASPER-VEC-401'||typeof bridge.evaluate!=='function')return pressureMaterialResponse;
    const domains=canonicalProductionField.domains||{};
    const response=bridge.evaluate({revision:canonicalProductionField.revision,energy:domains.energy||{},dynamics:domains.dynamics||{},relief:domains.relief||{},material:domains.material||{},time:(Number(frame&&frame.elapsedMs)||0)/1000,delta:Math.max(0,Math.min(.25,(Number(frame&&frame.deltaMs)||0)/1000))});
    pressureMaterialResponse=Object.freeze({packet:'GASPER-VEC-401',...response});
    return pressureMaterialResponse;
  }

  function computeVertexScreen(topo,contour,cx,cy){
    const n=topo.vertices.length,px=new Float64Array(n),py=new Float64Array(n),radial=new Float64Array(n);
    for(const v of topo.vertices){
      const ci=Math.round((((v.theta+Math.PI/2)%(2*Math.PI)+2*Math.PI)%(2*Math.PI))/(2*Math.PI)*contour.length)%contour.length;
      const b=contour[ci];
      px[v.index]=cx+(b.x-cx)*v.radial;py[v.index]=cy+(b.y-cy)*v.radial;radial[v.index]=v.radial;
    }
    return{px,py,radial};
  }
  function shadeLitMesh(topo,heights,px,py,radial,opts){
    // Shared normal-based quad shader for BOTH tiers: fit each grid cell to a surface plane from its four
    // screen corners + scaled heights, derive the screen-space normal, Lambert-shade against the fixed world
    // key light, emit the (slope-expanded) quad to highlight (light-facing) or shadow. The slope gate culls
    // flat cells so a 4000-cell grid only emits where the relief actually varies. Math is identical to the P0
    // analytic pass when called with DETAIL_TOPOLOGY + BAS_RELIEF opts (verified byte-equivalent d-lengths).
    const R=topo.rings,S=topo.sectors;
    const ll=Math.hypot(opts.light.x,opts.light.y,opts.light.z)||1;
    const Lx=opts.light.x/ll,Ly=opts.light.y/ll,Lz=opts.light.z/ll;
    const H=opts.heightScale,highlight=[],shadow=[];
    for(let r=0;r<R-1;r++){
      for(let s=0;s<S;s++){
        const s1=(s+1)%S;
        const i00=r*S+s,i01=r*S+s1,i10=(r+1)*S+s,i11=(r+1)*S+s1;
        const rad=(radial[i00]+radial[i01]+radial[i10]+radial[i11])*0.25;
        if(rad<opts.radialInner||rad>opts.radialOuter)continue;
        const x0=px[i00],y0=py[i00],x1=px[i01],y1=py[i01],x2=px[i11],y2=py[i11],x3=px[i10],y3=py[i10];
        const h0=heights[i00]*H,h1=heights[i01]*H,h2=heights[i11]*H,h3=heights[i10]*H;
        const fieldMagnitude=Math.max(Math.abs(h0),Math.abs(h1),Math.abs(h2),Math.abs(h3));
        if(fieldMagnitude<(opts.fieldFloor||0))continue;
        const ux=x1-x0,uy=y1-y0,uz=h1-h0,wx=x3-x0,wy=y3-y0,wz=h3-h0;
        let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;
        if(nz<0){nx=-nx;ny=-ny;nz=-nz;}
        const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
        const slope=Math.hypot(nx,ny);
        if(slope<opts.slopeFloor)continue;
        const lam=nx*Lx+ny*Ly+nz*Lz;
        const gx=(x0+x1+x2+x3)*0.25,gy=(y0+y1+y2+y3)*0.25,e=1+slope*opts.expand;
        const q=`M${(gx+(x0-gx)*e).toFixed(2)} ${(gy+(y0-gy)*e).toFixed(2)}L${(gx+(x1-gx)*e).toFixed(2)} ${(gy+(y1-gy)*e).toFixed(2)}L${(gx+(x2-gx)*e).toFixed(2)} ${(gy+(y2-gy)*e).toFixed(2)}L${(gx+(x3-gx)*e).toFixed(2)} ${(gy+(y3-gy)*e).toFixed(2)}Z`;
        if(lam>0)highlight.push(q);else shadow.push(q);
      }
    }
    return{highlight:highlight.join(''),shadow:shadow.join('')};
  }
  function basReliefSurfacePaths(heights,contour,profile){
    const cx=120+profile.cx,cy=110+profile.cy;
    const scr=computeVertexScreen(DETAIL_TOPOLOGY,contour,cx,cy);
    const pressureReliefGain=Math.max(0,Math.min(1,Number(pressureMaterialResponse.reliefGain)||0));
    const materialReliefGain=(.72+.42*canonicalMaterialResponse.normalStrength+.24*canonicalMaterialResponse.curvatureResponse+.12*canonicalMaterialResponse.texture)*(1+pressureReliefGain*.18);
    return shadeLitMesh(DETAIL_TOPOLOGY,heights,scr.px,scr.py,scr.radial,{light:BAS_RELIEF.light,heightScale:BAS_RELIEF.heightScale*reliefAmplitudeLive*materialReliefGain,fieldFloor:BAS_RELIEF.fieldFloor,slopeFloor:BAS_RELIEF.slopeFloor,expand:BAS_RELIEF.expand,radialInner:BAS_RELIEF.radialInner,radialOuter:BAS_RELIEF.radialOuter}); // D-0084/D-0085: non-goose analytic relief owns the shared quad shader; goosebumps use the bounded vector anchor path below. MAT-005 normal_strength + curvature_response + texture route through relief amplitude without changing topology.
  }
  const GOOSE_RELIEF_ANCHORS=Object.freeze([
    Object.freeze({u:.04,radial:.43,size:1.02,phase:.20}),Object.freeze({u:.13,radial:.61,size:.86,phase:1.10}),
    Object.freeze({u:.22,radial:.76,size:.98,phase:2.40}),Object.freeze({u:.31,radial:.49,size:1.12,phase:3.05}),
    Object.freeze({u:.40,radial:.68,size:.82,phase:4.20}),Object.freeze({u:.49,radial:.82,size:.94,phase:5.10}),
    Object.freeze({u:.58,radial:.54,size:1.08,phase:6.00}),Object.freeze({u:.67,radial:.73,size:.88,phase:6.90}),
    Object.freeze({u:.76,radial:.46,size:1.00,phase:7.80}),Object.freeze({u:.85,radial:.64,size:.90,phase:8.70}),
    Object.freeze({u:.94,radial:.78,size:.82,phase:9.60}),Object.freeze({u:.09,radial:.84,size:.76,phase:10.40}),
    Object.freeze({u:.27,radial:.57,size:.78,phase:11.30}),Object.freeze({u:.45,radial:.39,size:.90,phase:12.20}),
    Object.freeze({u:.63,radial:.86,size:.76,phase:13.10}),Object.freeze({u:.81,radial:.56,size:.84,phase:14.00}),
  ]); // D-0086: goosebumps remain a living vector material cue, but no longer expose the noisy 25x40 cellular field as tiled visible quads.
  function goosebumpsVectorPaths(contour,profile){
    const cx=120+profile.cx,cy=110+profile.cy,n=contour.length,highlight=[],shadow=[];
    for(const anchor of GOOSE_RELIEF_ANCHORS){
      const index=Math.round(anchor.u*n)%n,prev=contour[(index-1+n)%n],next=contour[(index+1)%n],boundary=contour[index];
      const tx=next.x-prev.x,ty=next.y-prev.y,len=Math.hypot(tx,ty)||1,nx=-ty/len,ny=tx/len;
      const pulse=.72+.28*(.5+.5*Math.sin(elapsed*.36+anchor.phase));
      const pressureReliefGain=Math.max(0,Math.min(1,Number(pressureMaterialResponse.reliefGain)||0));
      const size=anchor.size*(.86+.18*pulse)*(1+pressureReliefGain*.12),x=cx+(boundary.x-cx)*anchor.radial,y=cy+(boundary.y-cy)*anchor.radial;
      highlight.push(ellipseSubpath(x-nx*.34,y-ny*.34,size*1.18,size*.52));
      shadow.push(ellipseSubpath(x+nx*.42,y+ny*.42,size*1.28,size*.62));
    }
    return{highlight:highlight.join(' '),shadow:shadow.join(' ')};
  }
  function muteHardHighlights(){
    const hard=[keyCore,keyFacetA,keyFacetB,keyFacetC,keyFacetD,leftLobeGlint,rightLobeGlint,leftLobeGlintHalo,rightLobeGlintHalo,secondaryCore,fillHalo,fillBand];
    for(const n of hard){if(n)n.setAttribute('opacity','0');}
    if(keyReflectionLayer)keyReflectionLayer.setAttribute('opacity','0');
    if(lobeGlintsLayer)lobeGlintsLayer.setAttribute('opacity','0');
    if(secondaryReflectionLayer)secondaryReflectionLayer.setAttribute('opacity','0');
    const base=$('bodyBase');
    if(base){
      const stops=base.querySelectorAll('stop');
      if(stops[5])stops[5].setAttribute('stop-color','#8454d0');
      if(stops[6])stops[6].setAttribute('stop-color','#9468d4');
    }
    if(opticalDepth)opticalDepth.style.setProperty('opacity','0.22','important');
    const cosmic=$('cosmicTextureLayer');
    if(cosmic)cosmic.setAttribute('opacity','0.10');
    for(const id of ['cosmicCellA','cosmicCellB','cosmicCellC','cosmicCellD','cosmicCloudPath']){
      const n=$(id);if(n)n.setAttribute('opacity','0');
    }
    if(crownBloomPath)crownBloomPath.setAttribute('opacity','0.30');
  }
  function paintSurfaceShade(){
    const g=$('surfaceShade');
    if(g){g.replaceChildren();g.setAttribute('opacity','0');}
    const bloom=$('crownBloomGrad'),hot=$('crownHotGrad');
    const gx=Number(avatar&&avatar.dataset.lightRigGlintX);
    const gy=Number(avatar&&avatar.dataset.lightRigGlintY);
    if(bloom&&Number.isFinite(gx)&&gx!==0){
      bloom.setAttribute('cx',gx.toFixed(1));
      bloom.setAttribute('cy',gy.toFixed(1));
      bloom.setAttribute('r','52');
      const b0=bloom.querySelector('stop');
      if(b0){b0.setAttribute('stop-opacity','0.36');b0.setAttribute('stop-color','#fff6ff');}
    }
    if(hot&&Number.isFinite(gx)&&gx!==0){
      hot.setAttribute('cx',gx.toFixed(1));
      hot.setAttribute('cy',gy.toFixed(1));
      hot.setAttribute('r','20');
      const h0=hot.querySelector('stop');
      if(h0){h0.setAttribute('stop-opacity','0.42');h0.setAttribute('stop-color','#fffaff');}
    }
  }
  const liveGridXYZ=new Float32Array(1000*3);
  function bindHullToLiveGrid(pts){
    const R=25,S=40,n=pts.length;
    if(!n)return pts;
    const arc=new Float32Array(n+1);
    for(let i=0;i<n;i++){
      const a=pts[i],b=pts[(i+1)%n];
      arc[i+1]=arc[i]+Math.hypot((b.x||0)-(a.x||0),(b.y||0)-(a.y||0));
    }
    const total=arc[n]||1;
    const rimX=new Float32Array(S),rimY=new Float32Array(S);
    let k=0;
    for(let s=0;s<S;s++){
      const target=s/S*total;
      while(k<n-1&&arc[k+1]<target)k++;
      const span=arc[k+1]-arc[k]||1;
      const f=Math.max(0,Math.min(1,(target-arc[k])/span));
      const a=pts[k],b=pts[(k+1)%n];
      rimX[s]=(a.x||0)*(1-f)+(b.x||0)*f;
      rimY[s]=(a.y||0)*(1-f)+(b.y||0)*f;
    }
    let ax=0,ay=0;
    for(let s=0;s<S;s++){ax+=rimX[s];ay+=rimY[s];}
    const cx=ax/S,cy=ay/S;
    let sculpted=false;
    for(let s=0;s<S;s++){
      for(let r=0;r<R;r++){
        const i=r*S+s,v=r/Math.max(1,R-1);
        let ox=(rimX[s]-cx)*v,oy=(rimY[s]-cy)*v;
        const sx=gridSculpt[i*2]||0,sy=gridSculpt[i*2+1]||0;
        if(sx||sy){ox+=sx;oy+=sy;sculpted=true;}
        liveGridXYZ[i*3]=ox;
        liveGridXYZ[i*3+1]=oy;
        liveGridXYZ[i*3+2]=52*Math.sqrt(Math.max(0,1-v*v));
      }
    }
    if(sculpted){
      for(let i=0;i<n;i++){
        const u=arc[i]/total*S;
        const s0=((Math.floor(u)%S)+S)%S,s1=(s0+1)%S,f=u-Math.floor(u);
        const a=(R-1)*S+s0,b=(R-1)*S+s1;
        pts[i].x=cx+liveGridXYZ[a*3]*(1-f)+liveGridXYZ[b*3]*f;
        pts[i].y=cy+liveGridXYZ[a*3+1]*(1-f)+liveGridXYZ[b*3+1]*f;
      }
    }
    globalThis.__GASPER_GRID_XYZ__=liveGridXYZ;
    globalThis.__GASPER_GRID_CX__=cx;
    globalThis.__GASPER_GRID_CY__=cy;
    globalThis.__GASPER_GRID_SCULPT__=gridSculpt;
    return pts;
  }
  function paintScaffoldGrid(contour,profile){
    let g=$('scaffoldGridLayer');
    const on=globalThis.__GASPER_SHOW_GRID__!==false;
    if(!g){
      g=document.createElementNS('http://www.w3.org/2000/svg','g');
      g.setAttribute('id','scaffoldGridLayer');
    }
    const host=stepRig||idleRig||avatar;
    if(g.parentNode!==host)host.appendChild(g);
    g.setAttribute('clip-path','url(#bodyClip)');
    g.setAttribute('pointer-events','none');
    if(!on||!contour||!contour.length){
      g.setAttribute('opacity','0');
      g.replaceChildren();
      return;
    }
    const cx=Number(globalThis.__GASPER_GRID_CX__);
    const cy=Number(globalThis.__GASPER_GRID_CY__);
    const xyz=globalThis.__GASPER_GRID_XYZ__;
    const R=25,S=40;
    if(!xyz||xyz.length!==R*S*3||!Number.isFinite(cx)){
      g.setAttribute('opacity','0');
      g.replaceChildren();
      return;
    }
    const at=(r,s0)=>{
      const s=((s0%S)+S)%S,i=r*S+s;
      return (cx+(xyz[i*3]||0)).toFixed(1)+' '+(cy+(xyz[i*3+1]||0)).toFixed(1);
    };
    const html=[];
    for(let r=3;r<R;r++){
      let d='';
      for(let s0=0;s0<=S;s0++) d+=(s0?'L':'M')+at(r,s0);
      html.push('<path d="'+d+'Z" fill="none" stroke="#eaf7ff" stroke-width="'+(r===R-1?'1.05':'0.55')+'" stroke-opacity="'+(r===R-1?'0.95':'0.62')+'"/>');
    }
    for(let s0=0;s0<S;s0++){
      let d='';
      for(let r=3;r<R;r++) d+=(r>3?'L':'M')+at(r,s0);
      html.push('<path d="'+d+'" fill="none" stroke="#bfe9ff" stroke-width="0.45" stroke-opacity="0.55"/>');
    }
    for(let r=4;r<R;r++){
      for(let s=0;s<S;s++){
        const i=r*S+s;
        const hot=i===selectedGrid;
        html.push('<circle cx="'+(cx+(xyz[i*3]||0)).toFixed(1)+'" cy="'+(cy+(xyz[i*3+1]||0)).toFixed(1)+'" r="'+(hot?'3.4':'2.15')+'" fill="'+(hot?'#fff':'#eaf7ff')+'" fill-opacity="'+(hot?'1':'0.92')+'" stroke="#0b1a22" stroke-width="0.35"/>');
      }
    }
    g.innerHTML=html.join('');
    g.setAttribute('opacity','0.9');
  }
  function renderAdaptiveRelief(contour,profile){
    const started=performance.now(),highDetail=usesHighDetail();
    if(!highDetail||reliefPreset==='none'){
      activeReliefSamples=0;reliefLayer.setAttribute('opacity','0');reliefHighlight.setAttribute('d','');reliefShadow.setAttribute('d','');if(reliefHighlightSoft)reliefHighlightSoft.setAttribute('d','');if(reliefShadowSoft)reliefShadowSoft.setAttribute('d','');
      publishScaffoldRimZero();
      frameMetrics.reliefMs.push(performance.now()-started);return;
    }
    const evaluateStarted=performance.now(),heights=SidekickReliefFields.evaluateRelief(DETAIL_TOPOLOGY,RELIEF_PRESETS[reliefPreset],17);
    frameMetrics.reliefEvaluationMs.push(performance.now()-evaluateStarted);
    const goose=isGoose(reliefPreset);
    if(goose)publishScaffoldRimZero();else scaffoldRimFromRelief(heights);
    if(reliefEllipsesEnabled&&BAS_RELIEF.enabled){
      const normalStarted=performance.now(),paths=goose?goosebumpsVectorPaths(contour,profile):basReliefSurfacePaths(heights,contour,profile);
      frameMetrics.reliefNormalMs.push(performance.now()-normalStarted);
      reliefHighlight.setAttribute('d',paths.highlight);reliefShadow.setAttribute('d',paths.shadow);
      if(reliefHighlightSoft)reliefHighlightSoft.setAttribute('d',paths.highlight);if(reliefShadowSoft)reliefShadowSoft.setAttribute('d',paths.shadow);
      activeReliefSamples=RELIEF_SAMPLES;
      // VEC-302: soft companion path opacity replaces former filter blur tiers (goose = tighter, non-goose = broader soft layer).
      const gooseNow=isGoose(reliefPreset);reliefHighlight.setAttribute('opacity',gooseNow?'.28':'.45');reliefShadow.setAttribute('opacity',gooseNow?'.34':'.48');if(reliefHighlightSoft)reliefHighlightSoft.setAttribute('opacity',gooseNow?'.10':'.22');if(reliefShadowSoft)reliefShadowSoft.setAttribute('opacity',gooseNow?'.12':'.28');reliefLayer.setAttribute('opacity',gooseNow?'0.52':'0.70');
    }else{
      activeReliefSamples=0;reliefHighlight.setAttribute('d','');reliefShadow.setAttribute('d','');if(reliefHighlightSoft)reliefHighlightSoft.setAttribute('d','');if(reliefShadowSoft)reliefShadowSoft.setAttribute('d','');reliefLayer.setAttribute('opacity','0');
    }
    frameMetrics.reliefMs.push(performance.now()-started);
  }

  // VEC-201 ANALYTIC FEATURE BAS-RELIEF. Replaces the retired pixel-heightmap bas-relief path.
  // Logo "G", glasses frames/wells/bridge/temples, and embodiment fields are pure
  // signed-distance / Gaussian-ridge / parametric primitives sampled on DETAIL_TOPOLOGY (1000 pts).
  // Reuses shadeLitMesh + BAS_RELIEF key light. Intensity-only; outside guarded face block => FACE_GEOMETRY_SHA
  // unchanged. Reversible: FEATURE_RELIEF.enabled=false (or reliefEllipsesEnabled off) => layer hidden.
  // Provenance: analytic-vector-primitives (no canvas buffers, no pixel sampling, no bitmap intermediate).
  const FEATURE_RELIEF=Object.freeze({enabled:true,logoEnabled:true,embodimentEnabled:true,featureAmp:1.3,heightScale:6.0,fieldFloor:0.75,slopeFloor:0.035,expand:0.55,radialInner:0.0,radialOuter:0.98,featureSigma:0.0106,faceAnchorUV:Object.freeze({leftEye:[0.32,0.46],rightEye:[0.68,0.46],mouth:[0.50,0.80]}),lensR:0.115,logoCenter:Object.freeze([0.5,0.165]),logoR:0.09,heightBound:2.5,provenance:'analytic-vector-primitives',primitives:Object.freeze(['gaussian-ring','soft-disk-sdf','segment-distance-ridge','parametric-g-glyph','embodiment-analytic-field','face-anchor-affine'])}); // D-0085: localized feature field floor prevents low-amplitude glasses/logo tails from becoming tiled facial quads.
  function softRing(u,v,cx,cy,r,sigma){const d=Math.hypot(u-cx,v-cy),s=sigma>0?sigma:1e-6,t=(d-r)/s;return Math.exp(-0.5*t*t);}
  function softDisk(u,v,cx,cy,r,sigma){const d=Math.hypot(u-cx,v-cy)-r,s=sigma>0?sigma*0.6:1e-6;return 1/(1+Math.exp(d/s));}
  function softSegment(u,v,ax,ay,bx,by,sigma){const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy||1;let t=((u-ax)*dx+(v-ay)*dy)/len2;t=t<0?0:t>1?1:t;const d=Math.hypot(u-(ax+dx*t),v-(ay+dy*t)),s=sigma>0?sigma:1e-6;return Math.exp(-0.5*(d/s)*(d/s));}
  function logoGHeight(u,v){const cx=FEATURE_RELIEF.logoCenter[0],cy=FEATURE_RELIEF.logoCenter[1],R=FEATURE_RELIEF.logoR,sigma=FEATURE_RELIEF.featureSigma;const d=Math.hypot(u-cx,v-cy);const ring=Math.exp(-0.5*Math.pow((d-R)/sigma,2));const ang=Math.atan2(v-cy,u-cx);const gapW=0.55;const gap=Math.abs(ang)<gapW?Math.pow(Math.cos((ang/gapW)*(Math.PI/2)),2):0;const openRing=ring*(1-gap*0.95);const bar=softSegment(u,v,cx,cy,cx+R*0.95,cy,sigma*0.9);const bowl=softDisk(u,v,cx,cy,R*0.55,sigma)*0.25;return openRing*0.95+bar*0.85-bowl;}
  function glassesHeight(u,v){const le=FEATURE_RELIEF.faceAnchorUV.leftEye,re=FEATURE_RELIEF.faceAnchorUV.rightEye,r=FEATURE_RELIEF.lensR,sigma=FEATURE_RELIEF.featureSigma;const wellL=softDisk(u,v,le[0],le[1],r*0.92,sigma*1.2),wellR=softDisk(u,v,re[0],re[1],r*0.92,sigma*1.2);const frameL=softRing(u,v,le[0],le[1],r,sigma*0.85),frameR=softRing(u,v,re[0],re[1],r,sigma*0.85);const bridge=softSegment(u,v,le[0]+0.115,le[1],re[0]-0.115,re[1],sigma*0.9);const templeL=softSegment(u,v,le[0]-0.115,le[1],le[0]-0.18,le[1]-0.02,sigma*0.9);const templeR=softSegment(u,v,re[0]+0.115,re[1],re[0]+0.18,re[1]-0.02,sigma*0.9);return (frameL+frameR)*0.9+bridge*0.85+templeL*0.75+templeR*0.75-(wellL+wellR)*0.45;}
  function featureLogoGlassesHeight(u,v){const raw=logoGHeight(u,v)+glassesHeight(u,v);const b=FEATURE_RELIEF.heightBound;const c=raw<-b?-b:raw>b?b:raw;return c*FEATURE_RELIEF.featureAmp;}
  function faceAffineFromProjection(fp){
    if(!fp||!fp.leftEye||!fp.rightEye||!fp.mouth)return null;
    const P0x=fp.leftEye.x,P0y=fp.leftEye.y,P1x=fp.rightEye.x,P1y=fp.rightEye.y,P2x=fp.mouth.x,P2y=fp.mouth.y;
    const Q0=FEATURE_RELIEF.faceAnchorUV.leftEye,Q1=FEATURE_RELIEF.faceAnchorUV.rightEye,Q2=FEATURE_RELIEF.faceAnchorUV.mouth;
    const ax=P1x-P0x,ay=P1y-P0y,bx=P2x-P0x,by=P2y-P0y,det=ax*by-ay*bx;
    if(!Number.isFinite(det)||Math.abs(det)<1e-6)return null;
    const inv00=by/det,inv01=-bx/det,inv10=-ay/det,inv11=ax/det;
    const qax=Q1[0]-Q0[0],qay=Q1[1]-Q0[1],qbx=Q2[0]-Q0[0],qby=Q2[1]-Q0[1];
    const m00=qax*inv00+qbx*inv10,m01=qax*inv01+qbx*inv11,m10=qay*inv00+qby*inv10,m11=qay*inv01+qby*inv11;
    return{m00,m01,m10,m11,t0:Q0[0]-m00*P0x-m01*P0y,t1:Q0[1]-m10*P0x-m11*P0y};
  }
  function smoothstep01(t){return t<=0?0:t>=1?1:t*t*(3-2*t);}
  function wrappedU(u,c){const d=Math.abs(u-c);return Math.min(d,1-d);}
  function embodimentHeight(u,v,profileId){
    if(profileId==='comet')return 0.55*Math.sin(u*10+v*6)*Math.exp(-Math.pow(v-0.35,2)/(2*0.22*0.22));
    if(profileId==='dormant-orbit')return-0.9*Math.exp(-(Math.pow(wrappedU(u,0.5),2)+Math.pow(v-0.5,2))/(2*0.16*0.16));
    if(profileId==='low-orbit')return-0.7*smoothstep01((v-0.62)/0.18);
    if(profileId==='singularity')return 0.9*Math.exp(-Math.pow(v-0.60,2)/(2*0.045*0.045));
    return 0;
  }
  function clearFeatureReliefLayer(){
    if(!reliefFeatureLayer)return;
    reliefFeatureLayer.setAttribute('opacity','0');
    if(reliefFeatureHighlight)reliefFeatureHighlight.setAttribute('d','');
    if(reliefFeatureShadow)reliefFeatureShadow.setAttribute('d','');
    if(reliefFeatureHighlightSoft)reliefFeatureHighlightSoft.setAttribute('d','');
    if(reliefFeatureShadowSoft)reliefFeatureShadowSoft.setAttribute('d','');
  }
  function renderFeatureRelief(contour,profile,faceProjection,faceVisibility,morphId){
    try{
      if(!FEATURE_RELIEF.enabled||!reliefEllipsesEnabled||!reliefFeatureLayer){
        clearFeatureReliefLayer();return;
      }
      const embActive=FEATURE_RELIEF.embodimentEnabled&&(morphId==='comet'||morphId==='dormant-orbit'||morphId==='low-orbit'||morphId==='singularity');
      const facePresent=!!(FORM_PROFILES[morphId]&&FORM_PROFILES[morphId].face)&&faceVisibility>0.5;
      const logoActive=FEATURE_RELIEF.logoEnabled&&facePresent;
      if(!embActive&&!logoActive){
        clearFeatureReliefLayer();return;
      }
      const cx=120+profile.cx,cy=110+profile.cy;
      const scr=computeVertexScreen(DETAIL_TOPOLOGY,contour,cx,cy);
      const aff=logoActive?faceAffineFromProjection(faceProjection):null;
      const verts=DETAIL_TOPOLOGY.vertices,heights=new Float64Array(verts.length);
      const b=FEATURE_RELIEF.heightBound*2;
      for(const v of verts){
        let h=embActive?embodimentHeight(v.u,v.v,morphId):0;
        if(logoActive&&aff){
          const u=aff.m00*scr.px[v.index]+aff.m01*scr.py[v.index]+aff.t0;
          const vv=aff.m10*scr.px[v.index]+aff.m11*scr.py[v.index]+aff.t1;
          if(u>=0&&u<=1&&vv>=0&&vv<=1)h+=featureLogoGlassesHeight(u,vv);
        }
        heights[v.index]=h<-b?-b:h>b?b:h;
      }
      const paths=shadeLitMesh(DETAIL_TOPOLOGY,heights,scr.px,scr.py,scr.radial,{light:BAS_RELIEF.light,heightScale:FEATURE_RELIEF.heightScale,fieldFloor:FEATURE_RELIEF.fieldFloor,slopeFloor:FEATURE_RELIEF.slopeFloor,expand:FEATURE_RELIEF.expand,radialInner:FEATURE_RELIEF.radialInner,radialOuter:FEATURE_RELIEF.radialOuter});
      reliefFeatureHighlight.setAttribute('d',paths.highlight);reliefFeatureShadow.setAttribute('d',paths.shadow);
      if(reliefFeatureHighlightSoft)reliefFeatureHighlightSoft.setAttribute('d',paths.highlight);
      if(reliefFeatureShadowSoft)reliefFeatureShadowSoft.setAttribute('d',paths.shadow);
      // VEC-302: dual soft/core path layers replace reliefFeature SVG filter blur
      reliefFeatureHighlight.setAttribute('opacity','.52');reliefFeatureShadow.setAttribute('opacity','.56');
      if(reliefFeatureHighlightSoft)reliefFeatureHighlightSoft.setAttribute('opacity','.24');
      if(reliefFeatureShadowSoft)reliefFeatureShadowSoft.setAttribute('opacity','.30');
      reliefFeatureLayer.setAttribute('opacity','0.8');
      globalThis.__FEATURE_RELIEF_PROVENANCE__=FEATURE_RELIEF.provenance;
      globalThis.__FEATURE_RELIEF_PRIMITIVES__=FEATURE_RELIEF.primitives.slice();
    }catch(e){
      globalThis.__FEATURE_RELIEF_ERR__='renderFeatureRelief: '+(e&&e.message||String(e));
      globalThis.__FEATURE_RELIEF_ERR_STACK__=e&&e.stack||'';
      clearFeatureReliefLayer();
    }
  }

  function renderRestingFascia(contour,normals,profile,frame=materialOrganismFrame()){
    // D-0040 V3 (B) resting fascia coherence: a faint, always-on, APERIODIC surface read at neutral so the body
    // is never a featureless gradient — a "skin/membrane" that SUPPORTS the silhouette (silhouette-first §4.2),
    // drawn into the relief layer at low opacity. Rides the relief LAYER opacity only; publishes NO rim (the
    // neutral branch of renderAdaptiveRelief already published exact-zero rim, C4-05). Gated: neutral only
    // (reliefPreset==='none'; an active emotion relief mode already provides surface read), high detail,
    // reliefEllipsesEnabled, not reduced motion (§5.3 freeze). Aperiodic: three radial bands breathe at
    // incommensurate slow rates (freq*(1+b*0.17)) on the real-time clock (alive even at settled, like the D-0035
    // flare rationale), per-speckle phase offsets => no master sine, no 2-level toggle (§7.1/§8.1). Reversible:
    // FASCIA.enabled=false => returns early, leaving the neutral branch's opacity '0' + cleared paths (byte-identical).
    // GASPER-MAT-002: fascia intensity folds through shared evaluateMaterialLight (organism frame); it does not
    // re-author persistent subsurface-band identity (those live under renderPersistentMaterialFeatures).
    if(!FASCIA.enabled||reliefPreset!=='none'||!reliefEllipsesEnabled||reducedMotion){return;} // D-0040 V3 (B) gate FIX (patch #2): the fascia is cheap procedural ellipses (no relief-field evaluation), so it is NOT gated on usesHighDetail() — that helper is false at neutral+adaptive BY DESIGN for EVENT relief (its adaptive clause requires reliefPreset!=='none'), which would silence the resting fascia entirely (observed live: reliefLayer 0 at neutral-settled). Shows at neutral whenever enabled + reliefEllipsesEnabled + not reduced motion; subpixel at tiny previews.
    const _fasciaFrame=frame;
    const _fasciaLight=evaluateMaterialLight({point:{depth:-0.2},normal:{x:0,y:-1},phase:_fasciaFrame.elapsedMs/1000*0.05,profile,family:'subsurface_band'});
    const _fasciaLightK=0.85+0.3*_fasciaLight.intensity;
    const cx=120+profile.cx,cy=110+profile.cy,highlight=[],shadow=[],n=contour.length;
    for(let b=0;b<FASCIA.bands;b++){
      const radial=FASCIA.radialInner+(FASCIA.radialOuter-FASCIA.radialInner)*(b/(FASCIA.bands-1||1));
      const bandFreq=FASCIA.freq*(1+b*0.17);
      for(let k=0;k<FASCIA.perBand;k++){
        const idx=(Math.floor((k/FASCIA.perBand)*n)+b*FASCIA.stagger)%n;
        const boundary=contour[idx],normal=normals[idx]||{x:0,y:0};
        const ph=FASCIA.phase0+b*1.7+k*2.3;
        const breathe=0.5+0.5*Math.sin(elapsed*bandFreq*0.6+ph);
        const vis=Math.pow(breathe,1.6);
        if(vis<FASCIA.visFloor)continue;
        const x=cx+(boundary.x-cx)*radial,y=cy+(boundary.y-cy)*radial,size=FASCIA.size*(0.7+0.5*vis);
        highlight.push(ellipseSubpath(x-normal.x*0.5,y-normal.y*0.5,size,size));shadow.push(ellipseSubpath(x+normal.x*0.46,y+normal.y*0.46,size*1.08,size*1.08));
      }
    }
    reliefHighlight.setAttribute('d',highlight.join(' '));reliefShadow.setAttribute('d',shadow.join(' '));
    if(reliefHighlightSoft)reliefHighlightSoft.setAttribute('d',highlight.join(' '));if(reliefShadowSoft)reliefShadowSoft.setAttribute('d',shadow.join(' '));
    const _tenDef=FORM_TENSION.enabled?(1+FORM_TENSION.fasciaAmp*formTension):1; // D-0041 V3 Layer A: tension -> slightly more surface definition (the tense mass shows a touch more membrane); bounded + capped well under event-driven relief; reversible (enabled=false => 1)
    reliefHighlight.setAttribute('opacity',Math.min(0.5,FASCIA.speckleOpacity*_tenDef*_fasciaLightK).toFixed(3));reliefShadow.setAttribute('opacity',Math.min(0.5,FASCIA.speckleOpacity*_tenDef*_fasciaLightK).toFixed(3));
    if(reliefHighlightSoft)reliefHighlightSoft.setAttribute('opacity',Math.min(0.28,FASCIA.speckleOpacity*_tenDef*0.55*_fasciaLightK).toFixed(3));
    if(reliefShadowSoft)reliefShadowSoft.setAttribute('opacity',Math.min(0.28,FASCIA.speckleOpacity*_tenDef*0.55*_fasciaLightK).toFixed(3));
    reliefLayer.setAttribute('opacity',Math.min(0.30,FASCIA.opacity*_tenDef*_fasciaLightK).toFixed(3)); // D-0041 V3 Layer A: capped 0.30 << event-driven 0.52/0.70 (still a dark pearl, never a textured ball)
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
  function applyFabricSnap(pts,profile){
    if(globalThis.GasperField&&typeof globalThis.GasperField.tick==='function'){
      try{globalThis.GasperField.tick(1/60);}catch(_e){}
    }
    const outline=globalThis.__GASPER_FABRIC_OUTLINE__;
    const fab=globalThis.__GASPER_FABRIC__;
    if(!outline||!fab||fab.morph==='rest'||outline.length<8)return pts;
    const cx=120+(profile.cx||0),cy=110+(profile.cy||0);
    const n=outline.length/2;
    return pts.map((p)=>{
      const th=typeof p.th==='number'?p.th:Math.atan2(p.y-cy,p.x-cx);
      let u=(th+Math.PI/2)/(Math.PI*2);
      u=((u%1)+1)%1;
      const f=u*n;
      const i0=Math.floor(f)%n,i1=(i0+1)%n,t=f-Math.floor(f);
      return Object.assign({},p,{
        x:cx+(outline[i0*2]||0)*(1-t)+(outline[i1*2]||0)*t,
        y:cy+(outline[i0*2+1]||0)*(1-t)+(outline[i1*2+1]||0)*t
      });
    });
  }
  function viewFaceTransform(profile,physics=null){
    const fm=globalThis.__GASPER_FACE_ON_MESH__;
    const cx=fm&&fm.center?120+fm.center.x:120+(profile.faceX||0);
    const cy=fm&&fm.center?110+fm.center.y:112;
    const base=`translate(${cx.toFixed(2)} ${cy.toFixed(2)}) translate(0 ${profile.faceY||0}) scale(${(profile.faceScaleX).toFixed(4)} ${profile.faceScaleY}) translate(-120 -112)`;
    if(!physics)return base;
    return `translate(${physics.tx.toFixed(3)} ${physics.ty.toFixed(3)}) translate(${physics.cx.toFixed(3)} ${physics.cy.toFixed(3)}) rotate(${physics.rotation.toFixed(3)}) scale(${physics.sx.toFixed(5)} ${physics.sy.toFixed(5)}) translate(${-physics.cx.toFixed(3)} ${-physics.cy.toFixed(3)}) ${base}`;
  }
  function applyViewLobeParallax(profile=FORM_PROFILES[silhouetteProfile]){
    const metrics=getViewMetrics(profile),_leftIsNear=metrics.amount<0,leftScale=(_leftIsNear?metrics.nearLobeScale:metrics.farLobeScale).toFixed(4),rightScale=(_leftIsNear?metrics.farLobeScale:metrics.nearLobeScale).toFixed(4);
    for(const node of [leftLobeShade,leftLobeVolume,leftLobeGlint,leftLobeAura]){node.setAttribute('transform',`translate(34 111) scale(${leftScale} 1) translate(-34 -111)`);node.dataset.viewDepth=_leftIsNear?'near':'far';}
    for(const node of [rightLobeShade,rightLobeVolume,rightLobeGlint,rightLobeAura]){node.setAttribute('transform',`translate(206 111) scale(${rightScale} 1) translate(-206 -111)`);node.dataset.viewDepth=_leftIsNear?'far':'near';}

  } // N168: abs near/far magnitudes; yaw-sign assignment. Walk-right (−yaw) left=near, right=far.
  function applyFormPresence(){
    const profileId=silhouetteProfile,profile=FORM_PROFILES[profileId];
    faceRecessLayer.style.display='';faceEmissionLayer.style.display='';
    const faceTransform=viewFaceTransform(profile);
    faceRecessLayer.setAttribute('transform',faceTransform);faceEmissionLayer.setAttribute('transform',faceTransform);
    chromaticShell.setAttribute('opacity',profileShellOpacity(profileId).toFixed(3));
    avatar.dataset.formProfile=profileId;avatar.dataset.viewAuthority=viewYawDegrees===0?'front':'turntable-s1';avatar.dataset.yaw=String(viewYawDegrees);avatar.setAttribute('aria-label',`Gasper ${profile.label} form`);
  }
  function setSilhouetteProfile(profile,settle){if(!FORM_PROFILES[profile])return;const same=silhouetteProfile===profile;silhouetteProfile=profile;if(settle&&!same){BASE_CONTOUR=createBaseContour();FACE_SURFACE_ANCHORS=createFaceSurfaceAnchors();}applyFormPresence();applyLayerVisibility();renderSilhouetteProfileButtons();}
  function setDemoSilhouetteProfile(profile){setSilhouetteProfile(profile);demoIndex=Math.max(0,DEMO_SEQUENCE.indexOf(profile));}
  function setYaw(value){viewYawDegrees=clampYaw(value);yaw.value=String(viewYawDegrees);$('yawValue').textContent=`${viewYawDegrees.toFixed(0)}°`;applyFormPresence();}
  function renderSilhouetteProfileButtons(){document.querySelectorAll('[data-form-profile]').forEach(button=>{button.classList.toggle('active',button.dataset.formProfile===silhouetteProfile);button.onclick=()=>setDemoSilhouetteProfile(button.dataset.formProfile);});}
  function setPreviewSize(size){previewSize=size;avatar.style.setProperty('--avatar-size',`${size}px`);document.querySelectorAll('[data-preview-size]').forEach(button=>button.classList.toggle('active',Number(button.dataset.previewSize)===size));}
  function renderPreviewButtons(){document.querySelectorAll('[data-preview-size]').forEach(button=>{button.onclick=()=>setPreviewSize(Number(button.dataset.previewSize));});setPreviewSize(previewSize);}
  function setDetailTier(value){if(!['low','high','adaptive'].includes(value))throw new TypeError('unknown detail tier');detailTier=value;document.querySelectorAll('[data-detail-tier]').forEach(button=>button.classList.toggle('active',button.dataset.detailTier===detailTier));}
  function setReliefPreset(value,{manual=false}={}){if(!Object.hasOwn(RELIEF_PRESETS,value))throw new TypeError('unknown relief preset');reliefPreset=value;reliefPresetManual=manual;document.querySelectorAll('[data-relief]').forEach(button=>button.classList.toggle('active',button.dataset.relief===reliefPreset));} // D-0080: manual=true marks a user/API-set preset so applyEmotionRelief won't stomp it.
  function renderAdaptiveControls(){document.querySelectorAll('[data-detail-tier]').forEach(button=>{button.onclick=()=>setDetailTier(button.dataset.detailTier);});document.querySelectorAll('[data-relief]').forEach(button=>{button.onclick=()=>setReliefPreset(button.dataset.relief,{manual:true});});setDetailTier(detailTier);setReliefPreset(reliefPreset);}
  function syncLabels(){$('couplingValue').textContent=Number(coupling.value).toFixed(2);$('motionValue').textContent=Number(motion.value).toFixed(2);$('interiorValue').textContent=Number(interiorEnergy.value).toFixed(2);}

  function insetContour(pts,normals,inset){return pts.map((point,index)=>({...point,x:point.x-normals[index].x*inset,y:point.y-normals[index].y*inset}));}
  function meshCurve(mesh,coordinates){return coordinates.map(([ring,sector])=>mesh[ring*MESH_SECTORS+((sector%MESH_SECTORS)+MESH_SECTORS)%MESH_SECTORS]);}
  function setRecess(node,anchor,rx,ry){const offset=resolveFaceAnchorOffset(anchor);node.setAttribute('cx',(anchor.x+offset.x).toFixed(2));node.setAttribute('cy',(anchor.y+offset.y+1.2).toFixed(2));node.setAttribute('rx',rx);node.setAttribute('ry',ry);}

  // ── GASPER-MAT-002: pure material-space projection (VEC-401 frame; no mesh-index identity) ──
  function materialOrganismFrame(){
    const last=organismClock.getLastFrame?.();
    if(last&&Number.isFinite(last.timeMs)){
      return{
        timeMs:last.timeMs,
        elapsedMs:Number.isFinite(last.elapsedMs)?last.elapsedMs:organismClock.elapsed(),
        deltaMs:Number.isFinite(last.deltaMs)?last.deltaMs:(organismClock.getDeltaMs?.()||0),
        frameIndex:last.frameIndex|0,
      };
    }
    return{
      timeMs:organismClock.nowMs(),
      elapsedMs:organismClock.elapsed(),
      deltaMs:organismClock.getDeltaMs?.()||0,
      frameIndex:organismClock.getFrameIndex?.()||0,
    };
  }
  function sampleMaterialSpace(anchor,contour,profile){
    const n=Math.max(1,contour&&contour.length||0);
    const cx=120+((profile&&profile.cx)||0),cy=110+((profile&&profile.cy)||0);
    const u=(((Number(anchor.u)||0)%1)+1)%1;
    if(!contour||!contour.length){
      return{id:anchor.id,x:cx,y:cy,u,radial:Number(anchor.radial)||0.5,depth:Number(anchor.depth)||0};
    }
    const i0=Math.floor(u*n)%n,i1=(i0+1)%n,t=u*n-Math.floor(u*n);
    const a=contour[i0],b=contour[i1]||a;
    const bx=a.x+(b.x-a.x)*t,by=a.y+(b.y-a.y)*t;
    const radial=Number.isFinite(anchor.radial)?anchor.radial:0.5;
    const depth=Number.isFinite(anchor.depth)?anchor.depth:0;
    const x=cx+(bx-cx)*radial,y=cy+(by-cy)*radial;
    // Depth pulls toward center (negative depth deeper interior).
    const dx=(cx-x)*depth*0.12,dy=(cy-y)*depth*0.12;
    return{id:anchor.id,x:x+dx,y:y+dy,u,radial,depth};
  }
  function sampleMaterialNormal(anchor,normals,contourLength){
    const n=Math.max(1,contourLength||(normals&&normals.length)||1);
    const u=(((Number(anchor.u)||0)%1)+1)%1;
    const idx=Math.round(u*n)%n;
    const normal=(normals&&normals[idx])||{x:0,y:-1};
    const len=Math.hypot(normal.x,normal.y)||1;
    return{x:normal.x/len,y:normal.y/len};
  }
  function evaluateMaterialLight({point,normal,phase,profile,family,yaw=effectiveViewYaw()}){
    // Shared bounded intensity/depth response — routes LIGHT_RIG wrap/sheen + DEPTH_GLOW fold
    // without re-authoring the 6.5 palette (MAT-003). No hue mutation.
    void profile;
    const canonicalMaterial=canonicalProductionField.domains.material||{};
    const canonicalEnergy=canonicalProductionField.domains.energy||{};
    const material=canonicalMaterialResponse;
    // GASPER-VEC-401: pressure and relief are material-state inputs, not a
    // feature-layer-only effect. Keep the response bounded and route it through
    // the same shared light function used by fascia, bands, streaks, and hard
    // highlights so the organism cannot visually desynchronize across layers.
    const pressureGain=Math.max(0,Math.min(1,Number(pressureMaterialResponse.materialCoupling)||0));
    const reliefGain=Math.max(0,Math.min(1,Number(pressureMaterialResponse.reliefGain)||0));
    const keyGain=Math.max(.72,Math.min(1.28,.82+.30*material.keyIntensity));
    const rimGain=Math.max(.78,Math.min(1.20,.82+.28*material.rim));
    const pearlGain=Math.max(.78,Math.min(1.22,.82+.28*material.pearl));
    const clearcoatGain=Math.max(.76,Math.min(1.26,.78+.34*material.clearcoat));
    const absorptionGain=Math.max(.68,Math.min(1.04,1-.32*material.absorption));
    const textureGain=Math.max(.78,Math.min(1.22,.82+.28*material.texture));
    const normalGain=Math.max(.76,Math.min(1.24,.80+.28*material.normalStrength));
    const curvatureGain=Math.max(.76,Math.min(1.24,.80+.28*material.curvatureResponse));
    const energyGain=Number.isFinite(canonicalEnergy.internal_glow)?Math.max(.86,Math.min(1.16,.92+.24*canonicalEnergy.internal_glow)):1;
    const nx=(normal&&normal.x)||0,ny=(normal&&normal.y)||0;
    const direction=material.keyDirection;
    const keyDot=Math.max(0,(nx*(-.55+.18*direction)+ny*(-.65+.24*direction)+.22)*keyGain);
    const wrap=LIGHT_RIG.wrap;
    const diffuse=(keyDot+wrap)/(1+wrap);
    const sheen=Math.pow(Math.max(0,keyDot),Math.max(1,LIGHT_RIG.p1/(6*clearcoatGain)))*clearcoatGain;
    const depthTerm=0.55+0.45*Math.tanh((point&&Number.isFinite(point.depth)?point.depth:0)*1.2);
    const phaseTerm=0.5+0.5*Math.sin(Number(phase)||0);
    let intensity=diffuse*0.72+sheen*0.18+phaseTerm*0.10;
    intensity*=depthTerm*rimGain*energyGain*pearlGain*absorptionGain*textureGain*normalGain*curvatureGain*(1+pressureGain*.12)*(1+reliefGain*.08);
    // DEPTH_GLOW scalar (living range) folded into material response.
    if(DEPTH_GLOW.enabled){
      intensity*=1+DEPTH_GLOW.amp*Math.max(0,Math.min(1,depthGlow||0));
    }
    // SPATIAL_DEPTH_LIGHT: soft yaw-side bias (bounded).
    if(SPATIAL_DEPTH_LIGHT.enabled){
      const yawBias=Math.sin((Number(yaw)||0)*Math.PI/180)*0.08;
      intensity*=1+yawBias*nx;
    }
    // S8 (radial-facing-phd-memo, N39): the DORSAL SHEEN — a back-turned body
    // is lit, not dark: a faint backlight (max +15 %) rises past 100° and
    // saturates by 140° (the back read stays present). 0 in the cone.
    intensity*=1+0.15*Math.max(0,Math.min(1,Math.pow(Math.max(0,Math.min(1,(Math.abs(effectiveViewYaw())-100)/40)),2)*(3-2*Math.max(0,Math.min(1,(Math.abs(effectiveViewYaw())-100)/40)))));
    const fam=family||'cosmic_fleck';
    if(fam==='hard_highlight')intensity=Math.min(MATERIAL_CALIBRATION.response.hardHighlightOpacityCap,intensity*1.35+0.28);
    else if(fam==='subsurface_band')intensity=Math.min(MATERIAL_CALIBRATION.response.subsurfaceOpacityCap+0.04,intensity*0.18+0.04);
    else if(fam==='cosmic_streak')intensity=Math.min(MATERIAL_CALIBRATION.response.streakOpacityCap,intensity*0.55+0.08);
    else intensity=Math.min(MATERIAL_CALIBRATION.response.fleckOpacityCap,intensity*0.9+0.05);
    return{
      intensity:Math.max(0,Math.min(1,intensity)),
      depth:depthTerm,
      diffuse,
      sheen,
      canonical:{keyIntensity:material.keyIntensity,keyDirection:material.keyDirection,rim:material.rim,pearl:material.pearl,absorption:material.absorption,clearcoat:material.clearcoat,texture:material.texture,normalStrength:material.normalStrength,curvatureResponse:material.curvatureResponse},
    };
  }
  function projectMaterialFeature(anchor,contour,normals,frame,profile,family,materialFacingYawDeg=effectiveViewYaw()){
    const point=sampleMaterialSpace(anchor,contour,profile);
    const normal=sampleMaterialNormal(anchor,normals,contour&&contour.length);
    const elapsedMs=Number(frame&&(frame.elapsedMs!=null?frame.elapsedMs:frame.timeMs))||0;
    const freq=Number(anchor.frequency)||0;
    const phase=elapsedMs/1000*freq+(Number(anchor.phase)||0);
    const light=evaluateMaterialLight({point,normal,phase,profile,family:family||anchor.family,yaw:materialFacingYawDeg});
    return{
      id:anchor.id,
      x:point.x,y:point.y,u:point.u,radial:point.radial,depth:point.depth,
      normal,phase,light,
      frameTimeMs:Number(frame&&frame.timeMs)||0,
      frameElapsedMs:elapsedMs,
    };
  }
  function streakPathFromProjection(proj,length){
    const half=(Number(length)||12)*0.5;
    const nx=(proj.normal&&Number.isFinite(proj.normal.x))?proj.normal.x:0;
    const ny=(proj.normal&&Number.isFinite(proj.normal.y))?proj.normal.y:-1;
    const tx=-ny,ty=nx;
    const len=Math.hypot(tx,ty)||1,ux=tx/len,uy=ty/len;
    const x0=proj.x-ux*half,y0=proj.y-uy*half,x1=proj.x+ux*half,y1=proj.y+uy*half;
    return`M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  function renderPersistentMaterialFeatures(mesh,contour,normals,profile,frame=materialOrganismFrame(),faceSemanticVisibility=1,materialFacingYawDeg=effectiveViewYaw()){
    // MAT-002: one exact render-owned organism frame drives all four families. Identity is anchor.id only.
    const feats=VECTOR_MATERIAL_FEATURES;
    const response=MATERIAL_CALIBRATION.response;
    const pressure=evaluatePressureMaterialResponse(frame);
    const materialWithPressure={...canonicalMaterialResponse,pressureGain:pressure.materialCoupling,reliefGain:pressure.reliefGain};
    const last={frame,flecks:[],streaks:[],bands:[],highlights:[]};

    // MAT-004: prefer the realm-local inertial evaluator when packaged. The
    // existing analytic path below remains the standalone fallback, preserving
    // the original fixture's deterministic behavior when no runtime bridge is
    // installed.
    const vectorMaterial=globalThis.__GASPER_VECTOR_MATERIAL__;
    if(vectorMaterial&&typeof vectorMaterial.createVectorMaterialState==='function'&&typeof vectorMaterial.evaluateVectorMaterialFrame==='function'){
      if(!vectorMaterialRuntimeState)vectorMaterialRuntimeState=vectorMaterial.createVectorMaterialState(37);
      const _lifeCfgM=(globalThis.__GASPER_LIVE_COEFFS__||{}).life||{};const _lifeFloorM=Math.max(0,Math.min(0.9,Number(_lifeCfgM.restFloor)||0));const starTM=(Number(frame&&(frame.elapsedMs!=null?frame.elapsedMs:frame.timeMs))||0)/1000;const lifeDxM=_lifeFloorM>0.001?Math.sin(starTM*0.73)*10:0;const lifeDyM=_lifeFloorM>0.001?Math.cos(starTM*0.47)*8:0;
      const vectorFrame=vectorMaterial.evaluateVectorMaterialFrame(vectorMaterialRuntimeState,mesh||[],{
        dt:Math.max(0,Math.min(.25,(Number(frame.deltaMs)||0)/1000)),
        time:(Number(frame.elapsedMs)||0)/1000,
        energy:Math.max(0,Math.min(1,Number(interiorEnergy.value)||0)),
        motion:Math.max(0,Math.min(1,Math.max(Number(motion.value)||0,_lifeFloorM))),
        yaw:materialFacingYawDeg,
        coupling:Math.max(0,Math.min(1,Number(coupling.value)||0)),
        material:materialWithPressure,
      });
      for(const feature of vectorFrame.flecks){
        const node=materialFleckNodes[feature.id];
        if(!node)continue;
        const fx=Number(feature.x)+lifeDxM,fy=Number(feature.y)+lifeDyM;
        node.setAttribute('cx',fx.toFixed(2));node.setAttribute('cy',fy.toFixed(2));node.setAttribute('rx',Number(feature.rx).toFixed(2));node.setAttribute('ry',Number(feature.ry).toFixed(2));node.setAttribute('fill',feature.fill);node.setAttribute('opacity',Number(feature.opacity).toFixed(3));node.setAttribute('transform',`rotate(${Number(feature.rotation).toFixed(1)} ${fx.toFixed(2)} ${fy.toFixed(2)})`);
      }
      for(const feature of vectorFrame.streaks){
        const node=materialStreakNodes[feature.id];
        if(!node)continue;
        node.setAttribute('d',feature.d);node.setAttribute('stroke-width',Number(feature.strokeWidth).toFixed(2));node.setAttribute('opacity',Number(feature.opacity).toFixed(3));
      }
      for(const feature of vectorFrame.subsurfaceBands){
        const node=materialBandNodes[feature.id];
        if(!node)continue;
        node.setAttribute('cx',Number(feature.cx).toFixed(2));node.setAttribute('cy',Number(feature.cy).toFixed(2));node.setAttribute('rx',Number(feature.rx).toFixed(2));node.setAttribute('ry',Number(feature.ry).toFixed(2));node.setAttribute('opacity',Number(feature.opacity).toFixed(3));
      }
      const committedHighlights={};
      for(const feature of vectorFrame.highlights){
        const node=materialHardHighlightNodes[feature.id];
        if(!node)continue;
        // D-0060 reconciliation: compose the per-lobe view-depth gain into the
        // two glint highlights HERE (one-frame composition lag, declared), so
        // this commit is the one final write; the fold below skips those nodes
        // while this branch is active. highlight-face-left is untouched by the
        // fold and commits the field value directly. Bounds: field 0.42..1 x
        // gain 0.45..1.6, clamped to a readable 0.05..1 final write.
        const gain=feature.id==='highlight-nub-left'?depthLightGlintGain.left:feature.id==='highlight-nub-right'?depthLightGlintGain.right:1;
        const litOpacity=Math.max(.05,Math.min(1,Number(feature.opacity)*gain));
        // GASPER-MAT-005 / VM7: optical readability floors may not resurrect
        // the face-left authored light after facing authority withdraws the face.
        const semanticVisibility=feature.id==='highlight-face-left'?faceSemanticVisibility:1;
        const finalOpacity=litOpacity*semanticVisibility;
        node.setAttribute('opacity',finalOpacity.toFixed(3));
        committedHighlights[feature.id]=finalOpacity;
      }
      globalThis.__GASPER_MATERIAL_PROJECTION__={packet:'GASPER-MAT-004',clock:'VEC-401',coordinateSpace:'material',frame,revision:vectorFrame.revision,materialResponse:Object.freeze({...canonicalMaterialResponse}),pressureMaterial:Object.freeze({...pressure}),last:vectorFrame,features:vectorMaterial.features||VECTOR_MATERIAL_FEATURES,committedHighlights:Object.freeze({...committedHighlights})};
      avatar.dataset.materialSpace='persistent';
      avatar.dataset.vectorMaterialRevision=String(vectorFrame.revision);
      return;
    }

    // Cosmic flecks — update persistent ellipse nodes under materialFlecksLayer (never replaceChildren).
    // Loop bound written as "i < feats...." with spaces so raster scan does not treat "i<fe" as SVG <fe.
    for(let i=0;i < feats.cosmicFlecks.length;i++){
      const anchor=feats.cosmicFlecks[i];
      const proj=projectMaterialFeature(anchor,contour,normals,frame,profile,'cosmic_fleck',materialFacingYawDeg);
      last.flecks.push(proj);
      const node=materialFleckNodes[anchor.id];
      if(!node)continue;
      const inten=proj.light.intensity;
      const rx=0.85+0.55*inten+(i%3)*0.12;
      const ry=rx*(0.72+0.18*((i%5)/5));
      const cyan=proj.u>0.15&&proj.u<0.55;
      const _lifeCfgF=(globalThis.__GASPER_LIVE_COEFFS__||{}).life||{};const _lifeFloorF=Math.max(0,Math.min(0.9,Number(_lifeCfgF.restFloor)||0));const starTF=(Number(frame&&(frame.elapsedMs!=null?frame.elapsedMs:frame.timeMs))||0)/1000;const lifeDxF=_lifeFloorF>0.001?Math.sin(starTF*0.73)*10:0;const lifeDyF=_lifeFloorF>0.001?Math.cos(starTF*0.47)*8:0;
      node.setAttribute('cx',(proj.x+lifeDxF).toFixed(2));
      node.setAttribute('cy',(proj.y+lifeDyF).toFixed(2));
      node.setAttribute('rx',rx.toFixed(2));
      node.setAttribute('ry',ry.toFixed(2));
      node.setAttribute('fill',cyan?'#78fff0':'#efc8ff');
      node.setAttribute('opacity',Math.max(response.fleckOpacityMin,Math.min(response.fleckOpacityCap,0.32+0.48*inten)).toFixed(3));
      node.setAttribute('data-material-id',anchor.id);
      node.setAttribute('transform',`rotate(${((proj.phase*18)%70-35).toFixed(1)} ${proj.x.toFixed(2)} ${proj.y.toFixed(2)})`);
    }

    // Cosmic streaks — persistent path nodes; geometry from projection tangent.
    for(let i=0;i < feats.cosmicStreaks.length;i++){
      const anchor=feats.cosmicStreaks[i];
      const proj=projectMaterialFeature(anchor,contour,normals,frame,profile,'cosmic_streak',materialFacingYawDeg);
      last.streaks.push(proj);
      const node=materialStreakNodes[anchor.id];
      if(!node)continue;
      const len=10+i*2.4+4*proj.light.intensity;
      node.setAttribute('d',streakPathFromProjection(proj,len));
      node.setAttribute('opacity',Math.max(response.streakOpacityMin,Math.min(response.streakOpacityCap,0.10+0.28*proj.light.intensity)).toFixed(3));
      node.setAttribute('data-material-id',anchor.id);
    }

    // Subsurface bands — fainter circular under-surface ellipses (subordinate to hard highlights).
    // Opacity ordered faint→slightly less faint but always << hard highlight range.
    const bandBaseOpacity=[0.05,0.07,0.09];
    for(let i=0;i < feats.subsurfaceBands.length;i++){
      const anchor=feats.subsurfaceBands[i];
      const proj=projectMaterialFeature(anchor,contour,normals,frame,profile,'subsurface_band',materialFacingYawDeg);
      last.bands.push(proj);
      const node=materialBandNodes[anchor.id];
      if(!node)continue;
      const base=bandBaseOpacity[i]||0.06;
      const rx=14+i*3.5+6*proj.light.depth;
      const ry=rx*(0.55+0.08*i);
      node.setAttribute('cx',proj.x.toFixed(2));
      node.setAttribute('cy',proj.y.toFixed(2));
      node.setAttribute('rx',rx.toFixed(2));
      node.setAttribute('ry',ry.toFixed(2));
      node.setAttribute('opacity',Math.max(response.subsurfaceOpacityMin,Math.min(response.subsurfaceOpacityCap,base*(0.55+0.9*proj.light.intensity))).toFixed(3));
      node.setAttribute('data-material-id',anchor.id);
    }

    // Hard white highlights — keep existing ribbon `d` (set earlier); modulate intensity only.
    // Identities: highlight-nub-left/right + highlight-face-left on leftLobeGlint/rightLobeGlint/keyCore.
    const hardBase={
      'highlight-nub-left':0.86,
      'highlight-nub-right':0.82,
      'highlight-face-left':0.46,
    };
    for(let i=0;i < feats.hardHighlights.length;i++){
      const anchor=feats.hardHighlights[i];
      const proj=projectMaterialFeature(anchor,contour,normals,frame,profile,'hard_highlight',materialFacingYawDeg);
      last.highlights.push(proj);
      const node=materialHardHighlightNodes[anchor.id];
      if(!node)continue;
      const base=hardBase[anchor.id]||0.7;
      // Stay hard: high floor so nubs/face-left keep defining contrast.
      const litOp=Math.min(response.hardHighlightOpacityCap,Math.max(response.hardHighlightOpacityFloor,base*(0.62+0.48*proj.light.intensity)));
      const op=litOp*(anchor.id==='highlight-face-left'?faceSemanticVisibility:1);
      node.setAttribute('opacity',op.toFixed(3));
      node.setAttribute('data-material-id',anchor.id);
    }

    globalThis.__GASPER_MATERIAL_PROJECTION__={
      packet:'GASPER-MAT-002',
      clock:'VEC-401',
      frame,
      materialResponse:Object.freeze({...canonicalMaterialResponse}),
      pressureMaterial:Object.freeze({...pressure}),
      last,
      features:VECTOR_MATERIAL_FEATURES,
    };
  }

  let _fleckCache={key:'',frame:0,flecks:[]};
  function renderCosmicFlecks(mesh){
    if(canonicalProductionField.active){
      cosmicFlecks.replaceChildren();
      avatar.dataset.legacyCosmicFlecks='suppressed-canonical-field';
      return;
    }
    avatar.dataset.legacyCosmicFlecks='fallback';
    // D-0079 REVISED: the star dots (index%9===0) are restored (the user likes the cosmicFlecks) but the
    // blinking is cured by regenerating only on profile/state change or every 30 frames instead of every
    // frame. The dots now hold their position between regenerations; the soft cloud nebulae (index%29===0)
    // still track the mesh each frame. The settings rail's GAIN/Relief/etc. sliders do NOT drive this layer
    // (the "purple dots" the user saw are the debug-mesh picker points, a separate debug feature).
    const _lifeCfgC=(globalThis.__GASPER_LIVE_COEFFS__||{}).life||{};const _lifeFloorC=Math.max(0,Math.min(0.9,Number(_lifeCfgC.restFloor)||0));const starTC=elapsed;const lifeDxC=_lifeFloorC>0.001?Math.sin(starTC*0.73)*10:0;const lifeDyC=_lifeFloorC>0.001?Math.cos(starTC*0.47)*8:0;
    const key=silhouetteProfile+'|'+eightStateId;
    _fleckCache.frame++;
    if(_lifeFloorC>0.001||key!==_fleckCache.key||_fleckCache.frame>=30){
      _fleckCache.key=key;_fleckCache.frame=0;
      const flecks=[];
      for(const point of mesh){
        const faceDistance=Math.pow((point.x-120)/58,2)+Math.pow((point.y-112)/40,2);
        if(point.index%29===0&&point.radius>.34&&point.radius<.82&&faceDistance>.54){
          const cloud=document.createElementNS(NS,'ellipse'),cyan=point.theta>0&&point.theta<Math.PI;
          // VEC-302: analytic vector fleck cells with soft gradient fill — no SVG filter blur/turbulence
          cloud.setAttribute('cx',(point.x+lifeDxC).toFixed(2));cloud.setAttribute('cy',(point.y+lifeDyC).toFixed(2));cloud.setAttribute('rx',(6.5+(point.ring%3)*2.1).toFixed(2));cloud.setAttribute('ry',(3.8+(point.sector%3)*1.3).toFixed(2));cloud.setAttribute('fill',cyan?'url(#cloudCyanGrad)':'url(#cloudVioletGrad)');cloud.setAttribute('opacity',cyan?'.28':'.24');cloud.setAttribute('transform',`rotate(${((point.sector*23)%70-35).toFixed(1)} ${(point.x+lifeDxC).toFixed(2)} ${(point.y+lifeDyC).toFixed(2)})`);flecks.push(cloud);
          const cloudHalo=document.createElementNS(NS,'ellipse');cloudHalo.setAttribute('cx',(point.x+lifeDxC).toFixed(2));cloudHalo.setAttribute('cy',(point.y+lifeDyC).toFixed(2));cloudHalo.setAttribute('rx',(10+(point.ring%3)*2.6).toFixed(2));cloudHalo.setAttribute('ry',(6+(point.sector%3)*1.6).toFixed(2));cloudHalo.setAttribute('fill',cyan?'url(#cloudCyanGrad)':'url(#cloudVioletGrad)');cloudHalo.setAttribute('opacity',cyan?'.12':'.10');cloudHalo.setAttribute('transform',`rotate(${((point.sector*23)%70-35).toFixed(1)} ${(point.x+lifeDxC).toFixed(2)} ${(point.y+lifeDyC).toFixed(2)})`);flecks.push(cloudHalo);
        }
        if(point.index%9!==0||point.radius<.38||point.radius>.86||faceDistance<.66)continue;
        const dot=document.createElementNS(NS,'circle');dot.setAttribute('cx',(point.x+lifeDxC).toFixed(2));dot.setAttribute('cy',(point.y+lifeDyC).toFixed(2));dot.setAttribute('r',point.index%27===0?'1.28':'.72');dot.setAttribute('fill',point.theta>0&&point.theta<Math.PI?'#78fff0':'#efc8ff');dot.setAttribute('opacity',point.index%27===0?'.76':'.48');flecks.push(dot);
      }
      _fleckCache.flecks=flecks;
    }
    cosmicFlecks.replaceChildren(..._fleckCache.flecks);
  }
  function ellipseHalfPath(cx,cy,rx,ry,front){
    const k=.5522848;
    if(front)return `M ${(cx+rx).toFixed(2)} ${cy.toFixed(2)} C ${(cx+rx).toFixed(2)} ${(cy+k*ry).toFixed(2)} ${(cx+k*rx).toFixed(2)} ${(cy+ry).toFixed(2)} ${cx.toFixed(2)} ${(cy+ry).toFixed(2)} C ${(cx-k*rx).toFixed(2)} ${(cy+ry).toFixed(2)} ${(cx-rx).toFixed(2)} ${(cy+k*ry).toFixed(2)} ${(cx-rx).toFixed(2)} ${cy.toFixed(2)}`;
    return `M ${(cx-rx).toFixed(2)} ${cy.toFixed(2)} C ${(cx-rx).toFixed(2)} ${(cy-k*ry).toFixed(2)} ${(cx-k*rx).toFixed(2)} ${(cy-ry).toFixed(2)} ${cx.toFixed(2)} ${(cy-ry).toFixed(2)} C ${(cx+k*rx).toFixed(2)} ${(cy-ry).toFixed(2)} ${(cx+rx).toFixed(2)} ${(cy-k*ry).toFixed(2)} ${(cx+rx).toFixed(2)} ${cy.toFixed(2)}`;
  }
  // N1 ONE-BLINK-AUTHORITY: when the rig drives the live eight-state loop (reduced
  // motion OFF), the TS loop blink is the sole eye-aperture authority; the 0.5 floor
  // is dropped and FormMaster's internal idle blink is silenced. Default false keeps
  // shipped behavior for reduced-motion + MCP scrub. Declared after the face block
  // so the 580-715 doctrine window is never line-shifted.
  let externalBlinkAuthority = false;
  // N3 EYE-SEIZURE FIX (single-authority choke point): on the live loop the pixels read ONE
  // clean eye-aperture source pushed by the TS eight-state loop (family open + real blink),
  // bypassing the per-frame race between applySemanticPose and the geometric
  // setExpressionPreview/setMorphPreview blend that slammed current.eyeOpenL every frame
  // (probe: 0.054<->0.50 on alternating frames, 121 snaps/176). The eye SHAPE channels are
  // low-passed (~90ms) so no residual race jitter reaches the screen. null/false keeps the
  // shipped path for reduced-motion + MCP scrub. Declared after the face block so the
  // 580-715 doctrine window is never line-shifted.
  let externalEyeAperture = null;
  // D-0030 EYE REFRACTORY: automatic expression transitions own a bounded
  // multiplicative aperture/width recoil. Manual scrubbing stays exact/linear.
  let expressionPreviewMode='none',eyeRefractoryPreview=null,lastEyeRefractoryFrame=null;
  const eyeShapeSmooth = { wL: 1, wR: 1, tL: 0, tR: 0, liftL: 0, liftR: 0 };
  let eyeShapeSmoothSeeded = false;
    // D-0067 CALM-EYE APERTURE (F1): the missing aperture sibling of the N3 eyeShapeSmooth (:1203) /
    // mouthShapeSmooth (:1208) low-passes. Low-passes the OPEN-EYE BASE aperture (frameState.eyeOpenL/R)
    // which the applySemanticPose<->geometric-blend race slams each frame (:1693-1694 / :341) — the channel
    // N3 explicitly deferred (:1494-1495). The clean TS blink envelope (externalEyeAperture) is applied
    // AFTER the ease so blinks stay ballistic. Declared after the face block so the doctrine window is never
    // line-shifted. Reversible: enabled=false OR live-coeff eyeCalm.eyeCalmGain=0 => byte-identical fallback.
    const EYE_APERTURE_CALM = Object.freeze({enabled:true,tau:0.16,deadZone:0.004,envelopeTau:0.05}); // S7a (N36, 2026-08-06): tau 0.10->0.16 (the eyes-lead 0.16 idiom — the base ease now cuts the ~15-30Hz race jitter hard) + dedicated ENVELOPE low-pass (envelopeTau 0.05, fast enough to keep blinks ballistic but smoothing the per-frame multiplicative blinkEnv — the frame-verified 2-3-frame eye chatter was the un-smoothed envelope path); hysteresis snap (below) kills the raw<->eased alternation. Reversible: enabled=false OR live-coeff eyeCalm.eyeCalmGain=0 => byte-identical fallback.
    const eyeApertureSmooth = { oL: 0.55, oR: 0.55 };
    let eyeApertureSmoothSeeded = false;
    let eyeApertureErrL = 0, eyeApertureErrR = 0, eyeApertureEnv = 1; // S7a: one-directional hysteresis errors + blink-envelope calm state (N36)
  // N3 MOUTH CHOKE-POINT: same single-authority low-pass for the mouth channels the
  // race slams every frame (curve/skew/open/lift/width/pinch/round/pull). Declared after
  // the face block so the 580-715 doctrine window is never line-shifted.
  const mouthShapeSmooth = { w: .5, c: 0, o: 0, lf: 0, sk: 0, pn: 0, rd: 0, pL: 0, pR: 0 };
  let mouthShapeSmoothSeeded = false;
  // V1 TURBO LIVE-SCULPT: mutable per-profile gauss coefficient overrides for formRadiusAtFor.
  // Authored defaults remain in formRadiusAtFor (the ?? fallbacks); these overrides let the
  // live-sculpt panel tweak amplitudes at runtime without editing source. Declared after the
  // face block so the 580-715 doctrine window never line-shifts.
  function liveFormCoeffProfile(key,requested){
    if(key==='crownAmp'||key==='chinAmp'||key==='lobeAmp'||key==='cleftDepth'||key==='rootAmp'||key==='footAmp'||key==='armAmp'||key==='walkAmp'||key==='walkPeriod'||key==='walkAccent'||key==='walkEnable'||key==='stepDepth')return 'wispwalker';
    if(key==='baseShift'||key==='noseAmp'||key==='tailAmp'||key==='topPinch')return 'comet';
    return requested;
  }
  function setLiveFormCoeff(profile,key,value){
    const target=liveFormCoeffProfile(key,profile);
    if(!globalThis.__GASPER_LIVE_COEFFS__)globalThis.__GASPER_LIVE_COEFFS__={};
    if(!globalThis.__GASPER_LIVE_COEFFS__[target])globalThis.__GASPER_LIVE_COEFFS__[target]={};
    globalThis.__GASPER_LIVE_COEFFS__[target][key]=value;
    try{requestRuntimeFrame();}catch(_){}
    if(paused)try{requestFormMasterFrame();}catch(_){}
  }
  function sampleEyeRefractoryArc(fromId,toId,progress){
    const from=emotionFixture(fromId),to=emotionFixture(toId),arc=sampleRefractoryArc(progress),openDeltaL=(to.eyeOpenL||0)-(from.eyeOpenL||0),openDeltaR=(to.eyeOpenR||0)-(from.eyeOpenR||0),widthDeltaL=(to.eyeWidthL||1)-(from.eyeWidthL||1),widthDeltaR=(to.eyeWidthR||1)-(from.eyeWidthR||1),openStrengthL=Math.max(0,Math.min(1,Math.abs(openDeltaL)/.5)),openStrengthR=Math.max(0,Math.min(1,Math.abs(openDeltaR)/.5)),widthStrengthL=Math.max(0,Math.min(1,Math.abs(widthDeltaL)/.24)),widthStrengthR=Math.max(0,Math.min(1,Math.abs(widthDeltaR)/.24)),magnitude=Math.max(openStrengthL,openStrengthR,widthStrengthL,widthStrengthR),settleEnvelope=Math.max(0,arc.refractory),scale=(delta,strength,amplitude,min,max)=>strength<=1e-6||Math.abs(delta)<=1e-6?1:Math.max(min,Math.min(max,1+Math.sign(delta)*settleEnvelope*amplitude*strength));
    return{...arc,magnitude,settleEnvelope,apertureScaleL:scale(openDeltaL,openStrengthL,.075,.9,1.1),apertureScaleR:scale(openDeltaR,openStrengthR,.075,.9,1.1),widthScaleL:scale(widthDeltaL,widthStrengthL,.035,.96,1.04),widthScaleR:scale(widthDeltaR,widthStrengthR,.035,.96,1.04)};
  }
  function setExpressionTransitionPreview(fromId,toId,progress){const eyeFrame=sampleEyeRefractoryArc(fromId,toId,progress);setExpressionPreview(fromId,toId,eyeFrame.mix,{eyeFrame});return{...eyeFrame};}
  function clearDormantOptics(){
    for(const node of [accretionRearLens,accretionRearLensGlow,accretionRearLensOuter,accretionRearLensInner,accretionNearPlane,accretionNearPlaneGlow,accretionNearPlaneBand,accretionNearPlaneHot,accretionLowerLens,accretionDiscBackGlow,accretionDiscBack,accretionDiscFront,accretionDiscHotCore]){node.setAttribute('d','');node.setAttribute('opacity','0');}
    eventHorizonCore.setAttribute('opacity','0');eventHorizonCore.setAttribute('rx','0');eventHorizonCore.setAttribute('ry','0');photonRingInner.setAttribute('opacity','0');photonRingInner.setAttribute('rx','0');photonRingInner.setAttribute('ry','0');
  }
  function renderDormantFamilyOptics(pts,profile,idle,motionStrength,identityWeights){
    clearDormantOptics();
    const singularityWeight=Math.max(0,Math.min(1,identityWeights.singularity||0)),orbitWeight=Math.max(0,Math.min(1,identityWeights.orbit||0)),familyWeight=Math.max(0,Math.min(1,singularityWeight+orbitWeight));
    if(familyWeight<=.001)return;
    const collapse=singularityWeight/Math.max(.001,familyWeight),minX=Math.min(...pts.map(point=>point.x)),maxX=Math.max(...pts.map(point=>point.x)),minY=Math.min(...pts.map(point=>point.y)),maxY=Math.max(...pts.map(point=>point.y));
    const discContinuum=collapse*collapse; // D-0034 (A): continuous-disc gate, removes the dormant-orbit decorative ring (constitution 11.6); =0 at orbit (ring gone, traveling ember kept), =1 at singularity (disc byte-identical). Quadratic ease-in: the disc condenses only as the seed forms.
    const gyreSpin=(singularityWeight*(FORM_PROFILES.singularity.dormantSpin)+orbitWeight*(FORM_PROFILES['dormant-orbit'].dormantSpin))/Math.max(.001,familyWeight); // D-0034 (B): identity-weight blend of the authored per-profile spins (singularity 0.18 slow tight gyre / orbit 1.0), wired into the flow below (brief packet 1).
    const width=maxX-minX,height=maxY-minY,cx=(minX+maxX)/2,cy=(minY+maxY)/2+lerp(height*.035,height*.008,collapse),metrics=getViewMetrics(profile);
    // N60 IDENTITY CONTINUITY: Singularity optics are an internal organization of
    // the existing shell, not a replacement object painted at the shell's full
    // footprint. The prior D-0034/D-0036 tuning let the horizon and lens planes
    // reach near-full opacity and width at collapse=1, which made the character
    // read as a detached black-hole/ring VFX. Keep the same attached layers and
    // motion, but derive a contained seed envelope from the live contour so the
    // shell remains the primary mass through hold and wake.
    const seedContainment=lerp(1,.52,collapse),seedScale=lerp(1,.72,collapse); // N79: the horizon/gyre is a contained interior accent, not a second shell.
    const flareGate=singularityFlare*singularityWeight*motionStrength; // D-0035: flare gate = eased envelope x singularity realization x living motion (orbit singularityWeight=0 => no flare on the traveling ember; reduced motion motionStrength=0 => frozen)
    const settleGate=singularitySettle*singularityWeight,settleGather=1-settleGate*SINGULARITY_SETTLE.gather; // D-0036: entry compression-settle gate (orbit singularityWeight=0 => no gather on the traveling ember) + inward radius factor (1 at rest/held => byte-identical to D-0034/D-0035; eases back to 1)
    const slowPhase=idle.phase*Math.PI*2,breath=1+Math.sin(slowPhase)*lerp(.018,.008,collapse)*motionStrength;
    const ringRx=width*lerp(.76,.24,collapse)*seedScale*breath*settleGather,ringRy=Math.max(height*0.12,height*lerp(.20,.27,collapse))*seedScale*breath*Math.max(0.6,metrics.discPerspective)*settleGather; // N79: the singularity gyre is a small internal horizon accent; D-0036 settle remains the entry-only scale.
    const tilt=lerp(-7.0,-2.4,collapse)+Math.sin(slowPhase*.5)*lerp(2.4,.45,collapse)*motionStrength;
    const transform=`rotate(${tilt.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})`;
    const backD=ellipseHalfPath(cx,cy,ringRx,ringRy,false),frontD=ellipseHalfPath(cx,cy,ringRx,ringRy,true);
    accretionDiscBackGlow.setAttribute('d',backD);accretionDiscBack.setAttribute('d',backD);accretionDiscFront.setAttribute('d',frontD);accretionDiscHotCore.setAttribute('d',frontD);
    for(const node of [accretionDiscBackGlow,accretionDiscBack,accretionDiscFront,accretionDiscHotCore])node.setAttribute('transform',transform);
    accretionDiscBackGlow.setAttribute('opacity',(flareGate*SINGULARITY_FLARE.halo).toFixed(3)); // D-0035: soft halo blooms on the rare deep-internal flare (was a constant 0; existing authored node, no new layer; bounded +0.22)
    accretionDiscBack.setAttribute('opacity',(familyWeight*lerp(.78,.66,collapse)*discContinuum*seedContainment).toFixed(3)); // N60: contained internal orbit keeps the shell readable.
    const dripPulse=0.82+0.18*Math.sin(slowPhase*2+collapse);
    accretionDiscFront.setAttribute('opacity',(familyWeight*lerp(.94,.84,collapse)*dripPulse*discContinuum*seedContainment).toFixed(3)); // N60: front orbit remains attached but no longer replaces the shell.
    accretionDiscHotCore.setAttribute('opacity',Math.min(1,(familyWeight*lerp(.96,.82,collapse)*Math.min(1,dripPulse+0.12)+flareGate*SINGULARITY_FLARE.hotCore)*seedContainment).toFixed(3)); // N60 + D-0035: the internal ember remains visible without becoming the body.
    accretionDiscHotCore.setAttribute('stroke-width',lerp(3.2,2.3,collapse).toFixed(2));
    accretionDiscHotCore.setAttribute('stroke-linecap','round');
    // CONTINUOUS_FLUID_LOOP drip: ONE fat rounded viscous droplet with a tapering tail
    // oozing around the orbit. The big gap keeps a single droplet on the visible front
    // arc (a viscous drip, not a dotted marquee -> avoids the screensaver-noise anti-pattern).
    const dripHead=ringRx*lerp(.15,.20,collapse),dripTail=ringRx*lerp(.30,.20,collapse),dripGap=ringRx*lerp(1.9,1.4,collapse);
    accretionDiscHotCore.setAttribute('stroke-dasharray',`${dripHead.toFixed(2)} ${(ringRx*0.05).toFixed(2)} ${dripTail.toFixed(2)} ${dripGap.toFixed(2)}`);
    const flowPhase=(idle.phase*1.5*gyreSpin)%1,flowEase=flowPhase*flowPhase*(3-2*flowPhase); // D-0034 (B): gyre flow honors the authored dormantSpin (singularity slow / orbit unchanged at 1.0)
    accretionDiscHotCore.setAttribute('stroke-dashoffset',(-flowEase*ringRx*lerp(3.6,1.7,collapse)-idle.phase*gyreSpin*ringRx*0.9).toFixed(2)); // D-0034 (B): droplet drift honors gyreSpin so the whole travel slows at singularity

    const horizonRx=width*lerp(.10,.18,collapse)*seedScale*breath*settleGather,horizonRy=height*lerp(.075,.19,collapse)*seedScale*breath*settleGather; // N60: the dark seed is a contained interior, not a full-width void.
    eventHorizonCore.setAttribute('cx',cx.toFixed(2));eventHorizonCore.setAttribute('cy',cy.toFixed(2));eventHorizonCore.setAttribute('rx',horizonRx.toFixed(2));eventHorizonCore.setAttribute('ry',horizonRy.toFixed(2));eventHorizonCore.setAttribute('transform',transform);eventHorizonCore.setAttribute('fill',collapse>.5?'#010008':'#08031a');eventHorizonCore.setAttribute('opacity',(familyWeight*lerp(.06,.58,collapse)*seedContainment).toFixed(3));
    photonRingInner.setAttribute('cx',cx.toFixed(2));photonRingInner.setAttribute('cy',cy.toFixed(2));photonRingInner.setAttribute('rx',(horizonRx*lerp(1.44,1.055,collapse)).toFixed(2));photonRingInner.setAttribute('ry',(horizonRy*lerp(1.36,1.055,collapse)).toFixed(2));photonRingInner.setAttribute('transform',transform);photonRingInner.setAttribute('opacity',Math.min(1,(familyWeight*lerp(.14,.46,collapse)+flareGate*SINGULARITY_FLARE.photon+settleGate*SINGULARITY_SETTLE.photon)*seedContainment).toFixed(3)); // N60 + D-0035/D-0036: bounded inner flash, subordinate to the shell.

    const innerRx=ringRx*lerp(.78,.86,collapse),innerRy=ringRy*lerp(.70,.48,collapse),innerBack=ellipseHalfPath(cx,cy-height*.006,innerRx,innerRy,false),innerFront=ellipseHalfPath(cx,cy+height*.004,innerRx,innerRy,true);
    accretionRearLensGlow.setAttribute('d',innerBack);accretionRearLens.setAttribute('d',innerBack);accretionRearLensOuter.setAttribute('d',ellipseHalfPath(cx,cy-height*.012,innerRx*.94,innerRy*1.55,false));accretionRearLensInner.setAttribute('d',ellipseHalfPath(cx,cy,innerRx*.78,innerRy*.48,false));
    accretionNearPlaneGlow.setAttribute('d',innerFront);accretionNearPlane.setAttribute('d',innerFront);accretionNearPlaneBand.setAttribute('d',innerFront);accretionNearPlaneHot.setAttribute('d',innerFront);
    const polarTilt=lerp(58,24,collapse)+Math.sin(slowPhase*.34)*4*motionStrength,polarTransform=`rotate(${polarTilt.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})`;
    accretionLowerLens.setAttribute('d',ellipseHalfPath(cx,cy,ringRx*lerp(.58,.42,collapse),ringRy*lerp(1.55,.84,collapse),true));
    for(const node of [accretionRearLensGlow,accretionRearLens,accretionRearLensOuter,accretionRearLensInner,accretionNearPlaneGlow,accretionNearPlane,accretionNearPlaneBand,accretionNearPlaneHot])node.setAttribute('transform',transform);
    accretionLowerLens.setAttribute('transform',polarTransform);
    accretionRearLensGlow.setAttribute('opacity',(familyWeight*lerp(.13,.20,collapse)*seedContainment).toFixed(3));accretionRearLens.setAttribute('opacity',(familyWeight*lerp(.46,.72,collapse)*seedContainment).toFixed(3));accretionRearLensOuter.setAttribute('opacity',(familyWeight*lerp(.38,.48,collapse)*seedContainment).toFixed(3));accretionRearLensInner.setAttribute('opacity',(familyWeight*lerp(.52,.64,collapse)*seedContainment).toFixed(3));
    accretionNearPlaneGlow.setAttribute('opacity',(familyWeight*lerp(.16,.22,collapse)*seedContainment).toFixed(3));accretionNearPlane.setAttribute('opacity',(familyWeight*lerp(.54,.88,collapse)*seedContainment).toFixed(3));accretionNearPlaneBand.setAttribute('opacity',(familyWeight*lerp(.42,.58,collapse)*seedContainment).toFixed(3));accretionNearPlaneHot.setAttribute('opacity',(familyWeight*lerp(.64,.82,collapse)*seedContainment).toFixed(3));
    accretionLowerLens.setAttribute('opacity',(familyWeight*orbitWeight*lerp(.46,.08,collapse)*seedContainment).toFixed(3));
  }
  function renderAccretionDisc(pts,profile,idle,motionStrength,identityWeights){if(identityWeights.orbit>0 && !identityWeights.singularity){return;} // D-0077: skip dormant-family optics for pure dormant-orbit (removes the awkward partially-visible accretion ring)
    renderDormantFamilyOptics(pts,profile,idle,motionStrength,identityWeights);}
  function renderMaterialRig(pts,normals,mesh,faceAnchors=FACE_SURFACE_ANCHORS,frame=materialOrganismFrame(),faceSemanticVisibility=1,materialFacingYawDeg=effectiveViewYaw()){
    shellChromaticPath.setAttribute('d',closedSpline(insetContour(pts,normals,2.8)));
    innerVolumePath.setAttribute('d',closedSpline(insetContour(pts,normals,5.8)));
    pearlCorePath.setAttribute('d',closedSpline(insetContour(pts,normals,12.5)));
    violetCorePath.setAttribute('d',closedSpline(insetContour(pts,normals,14.5)));
    crownVolumePath.setAttribute('d',closedSpline(pts));apexGlowNode.setAttribute('d',closedSpline(pts)); // D-0068 (F2): FULL contour (not inset) => the volumetric fill reaches the apex rim; bodyClip (:1469) contains it
    cosmicCloudPath.setAttribute('d',closedSpline(insetContour(pts,normals,9.5)));

    cosmicCellA.setAttribute('d',closedSpline(meshCurve(mesh,[[10,19],[11,20],[10,21],[8,22],[7,21],[8,20]])));cosmicCellB.setAttribute('d',closedSpline(meshCurve(mesh,[[8,1],[10,2],[10,3],[9,4],[7,4],[7,2]])));cosmicCellC.setAttribute('d',closedSpline(meshCurve(mesh,[[11,12],[13,13],[13,14],[13,15],[12,16],[10,15]])));cosmicCellD.setAttribute('d',closedSpline(meshCurve(mesh,[[11,5],[13,6],[13,7],[13,8],[12,9],[10,8]])));
    // GASPER-MAT-006: legacy fixed mesh-index caustics retired; canonical cosmic-streak-* material identities are the sole streak family.
    keyFacetA.setAttribute('d',closedSpline(meshCurve(mesh,[[13,19],[13,20],[12,21],[11,22],[10,21],[11,20]])));keyFacetB.setAttribute('d',closedSpline(meshCurve(mesh,[[13,23],[13,0],[12,1],[10,2],[9,1],[10,0],[11,23]])));keyFacetC.setAttribute('d',closedSpline(meshCurve(mesh,[[12,20],[13,21],[12,22],[10,22],[9,21],[10,20]])));keyFacetD.setAttribute('d',closedSpline(meshCurve(mesh,[[11,23],[12,0],[11,1],[9,1],[8,0],[9,23]])));
    // D-0072: ride the SAME authored hotspot ribbon ~12px closer to the rim (off 8+13q -> 3.5+6q) so the hard highlight crosses the apex strip (the crown void) instead of dying 13-21px below it; envelope/width/anchors unchanged.
    const crown=ribbonFromAnchors(pts,normals,CROWN_ANCHORS,[-.42,-.91],3,18,22,34),crownHot=ribbonFromAnchors(pts,normals,CROWN_HOT_ANCHORS,[-.18,-.98],3.5,6,5,12),cyan=ribbonFromAnchors(pts,normals,CYAN_ANCHORS,[0,-1],2,16,12,24);
    crownBloomPath.setAttribute('d',ribbonPath(crown.outer,crown.inner));cyanReservoirPath.setAttribute('d',ribbonPath(cyan.outer,cyan.inner));
    const rightPin=ribbonFromAnchors(pts,normals,RIGHT_CROWN_PIN_ANCHORS,[.56,-.83],5.4,7.2,2.0,4.8),secondary=ribbonFromAnchors(pts,normals,SECONDARY_ANCHORS,[.84,-.54],8,10,2.2,5.2),leftLobeVolumeRig=ribbonFromAnchors(pts,normals,LEFT_LOBE_ANCHORS,[-.95,-.18],1.2,4.0,7.0,11.0),rightLobeVolumeRig=ribbonFromAnchors(pts,normals,RIGHT_LOBE_ANCHORS,[.94,-.22],1.4,3.8,6.4,10.2),leftLobe=ribbonFromAnchors(pts,normals,LEFT_LOBE_ANCHORS,[-.95,-.18],2.4,7,2.2,5.8),rightLobe=ribbonFromAnchors(pts,normals,RIGHT_LOBE_ANCHORS,[.94,-.22],3.2,6,1.8,4.2);
    secondaryCore.setAttribute('d',ribbonPath(secondary.outer,secondary.inner));leftLobeShade.setAttribute('d',ribbonPath(leftLobeVolumeRig.outer,leftLobeVolumeRig.inner));rightLobeShade.setAttribute('d',ribbonPath(rightLobeVolumeRig.outer,rightLobeVolumeRig.inner));leftLobeVolume.setAttribute('d',ribbonPath(leftLobeVolumeRig.outer,leftLobeVolumeRig.inner));rightLobeVolume.setAttribute('d',ribbonPath(rightLobeVolumeRig.outer,rightLobeVolumeRig.inner));
    const leftGlintD=ribbonPath(leftLobe.outer,leftLobe.inner),rightGlintD=ribbonPath(rightLobe.outer,rightLobe.inner);
    leftLobeGlint.setAttribute('d',leftGlintD);rightLobeGlint.setAttribute('d',rightGlintD);
    if(leftLobeGlintHalo)leftLobeGlintHalo.setAttribute('d',leftGlintD);if(rightLobeGlintHalo)rightLobeGlintHalo.setAttribute('d',rightGlintD);
    leftLobeAura.setAttribute('d',leftGlintD);rightLobeAura.setAttribute('d',rightGlintD);
    if(leftLobeAuraOuter)leftLobeAuraOuter.setAttribute('d',leftGlintD);if(rightLobeAuraOuter)rightLobeAuraOuter.setAttribute('d',rightGlintD);
    const rightRimD=openSpline(centerlineFromAnchors(pts,normals,[5.76,5.92,6.08,6.24,.12,.28,.44],[.86,.42],.6,1.8));
    rightRim.setAttribute('d',rightRimD);if(rightRimOuter)rightRimOuter.setAttribute('d',rightRimD);
    // GASPER-MAT-002: project persistent flecks/streaks/bands/hard-highlights in material space
    // through one shared VEC-401 frame (after ribbon geometry so hard-highlight nodes have `d`).
    renderPersistentMaterialFeatures(mesh,pts,normals,FORM_PROFILES[silhouetteProfile]||FORM_PROFILES['presence-neutral-settled']||{cx:0,cy:0},frame,faceSemanticVisibility,materialFacingYawDeg);
    // Legacy dynamic decorative flecks remain on separate cosmicFlecks host (replaceChildren allowed there only).
    renderCosmicFlecks(mesh);
  }

  function render(now,forcedDeltaMs){
    const _ge=globalThis.__GASPER_GEONODES_EVAL__;
    if(_ge&&_ge.params&&_ge.params.cage&&_ge.params.cage.grid!==undefined)
      globalThis.__GASPER_SHOW_GRID__=!_ge.mute?.cage&&+_ge.params.cage.grid>0.5;
    const scriptStarted=performance.now(),organismFrame=materialOrganismFrame(),dt=Math.max(0,Math.min(.05,(forcedDeltaMs??(organismClock.getDeltaMs?.()||0))/1000));lastTime=now;elapsed=organismFrame.elapsedMs/1000;
    if(!paused&&emotionDemoMode&&!runtimeDormant){emotionDemoClock+=dt;const hold=2.65;if(emotionDemoClock>=hold){emotionDemoClock=0;emotionDemoIndex=(emotionDemoIndex+1)%EMOTION_DEMO_SEQUENCE.length;setEmotionFixture(EMOTION_DEMO_SEQUENCE[emotionDemoIndex],{source:'demo'});}}
    let morphProfileId=silhouetteProfile,nextMorphProfileId=silhouetteProfile,morphMix=0,morphArc=null;
    if(manualMorph){
      morphProfileId=manualMorph.from;nextMorphProfileId=manualMorph.to;morphMix=manualMorph.mix;morphArc=manualMorph.transitionArc||null;silhouetteProfile=morphProfileId;
    }else if(demoMode){
      const cycle=DEMO_HOLD_SECONDS+DEMO_MORPH_SECONDS,phase=elapsed%cycle;
      if(phase<demoLastPhase){demoIndex=(demoIndex+1)%DEMO_SEQUENCE.length;silhouetteProfile=DEMO_SEQUENCE[demoIndex];applyFormPresence();applyLayerVisibility();renderSilhouetteProfileButtons();}
      demoLastPhase=phase;morphProfileId=DEMO_SEQUENCE[demoIndex];nextMorphProfileId=DEMO_SEQUENCE[(demoIndex+1)%DEMO_SEQUENCE.length];
      if(phase>DEMO_HOLD_SECONDS){const t=(phase-DEMO_HOLD_SECONDS)/DEMO_MORPH_SECONDS;morphArc=sampleRefractoryArc(t);morphMix=morphArc.mix;}
    }
    avatar.style.opacity='1';
    if(frameMetrics.lastFrameAt){const interval=now-frameMetrics.lastFrameAt;frameMetrics.frameIntervalMs.push(interval);if(interval>25)frameMetrics.droppedFrames+=1;}frameMetrics.lastFrameAt=now;
    const unifiedDynamics=unifiedProductionDynamics();
    const unifiedLight=canonicalUnifiedLightFrame(unifiedDynamics);
    let cycleSeconds=unifiedDynamics
      ? unifiedDynamics.timeSeconds
      : (fixedIdlePhase===null?elapsed+idleClockOffset:fixedIdlePhase*IDLE_CYCLE_SECONDS);
    let idle=reducedMotion?idleCycleAt(0):idleCycleAt(cycleSeconds);
    if(unifiedDynamics){
      const breath01=.5+unifiedDynamics.breath/.06;
      idle={
        ...idle,
        phase:unifiedDynamics.breathPhase,
        breath:Math.max(0,Math.min(1,breath01)),
        driftX:unifiedDynamics.wander*.9,
        liftY:unifiedDynamics.springY*36+unifiedDynamics.breath*18,
        blink:0,
        reflectionX:unifiedDynamics.springTheta*110+unifiedDynamics.wander*1.5,
        reflectionY:unifiedDynamics.springY*28,
        lobeLag:unifiedDynamics.springTheta*40,
        reservoirX:unifiedDynamics.springX*40,
        reservoirY:unifiedDynamics.springY*34,
      };
    }
    // V2.4 REST GATE (D-0018): reuse the canonical "settled" definition (cf. waitForSettled below).
    // Ease bodyRestGate -> 0 when settled so the autonomous micro fades out (tau ~0.45s) and a
    // settled frame is bit-stable; ease back -> 1 when a transition/morph/behavior begins so the
    // micro is consequent to that real movement. morphMix<.001 = no embodiment morph in flight.
    const _lifeCfg=(globalThis.__GASPER_LIVE_COEFFS__||{}).life||{};const _lifeFloor=Math.max(0,Math.min(0.9,Number(_lifeCfg.restFloor)||0));const _breathGainT=Math.max(0,Math.min(3,Number(_lifeCfg.breathGain)||1));const _lifeWarm=Math.max(0,Math.min(0.3,Number(_lifeCfg.restWarmth)||0));breathGainE=lerp(breathGainE,_breathGainT,1-Math.exp(-dt/0.6));if(_lifeFloor>0.001){const starT=cycleSeconds;idle={...idle,reflectionX:idle.reflectionX+Math.sin(starT*0.73)*10,reflectionY:idle.reflectionY+Math.cos(starT*0.47)*8,reservoirX:idle.reservoirX+Math.sin(starT*0.61+1.2)*8,reservoirY:idle.reservoirY+Math.cos(starT*0.39+0.4)*6,lobeLag:idle.lobeLag+Math.sin(starT*0.53)*6};} // GASPER-ALIVE-002 (D-0109): the life substrate intake — restFloor lifts the D-0018 rest gate while the life authority's gate is open (subkey absent => 0/1/0 => byte-identical); breathGain eases so gate hand-offs never pop; restWarmth eases a calm half-smile floor into neutral-settled
    const _restSettled=(morphMix<0.001)&&transitionProgress()>=0.999&&!demoMode&&!emotionDemoMode&&behaviorMorphStatus==='idle';
    bodyRestGate=lerp(bodyRestGate,_restSettled?_lifeFloor:1,1-Math.exp(-dt/0.45)); // D-0109 A-2: the rest gate floors at the life floor instead of 0 (the autonomous micro persists at home under life authority); D-0018 exact when floor 0
    // The canonical field owns the live substrate. The authored FormMaster
    // micro-oscillator is retained only as an unmounted compatibility fallback.
    if(unifiedDynamics&&_lifeFloor<=0.001)bodyRestGate=0;
    const motionStrength=reducedMotion?0:Number(motion.value)*lifeScale;const starMotion=reducedMotion?0:Math.max(Number(motion.value)*lifeScale,_lifeFloor);
    // S5 E-LAW 2 (expression-attention-phd-memo): the body follows the face at the bank idiom
    // τ=τ_c·φ≈0.0971 s. The gate is the TRUE motion channel — under reduced motion / pause the
    // carrier collapses to 0 (the face keeps its existing static-shape policy; the silhouette is
    // byte-identical). Eased BEFORE composeFixtureMotion below so the fold reads the live carrier.
    exprBodyFe=lerp(exprBodyFe,motionStrength>0?physFaceEnergy:0,1-Math.exp(-dt/(0.06*AMORPH_PHI)));
    // S5 A-LAW 2 (expression-attention-phd-memo): body-yaw pursuit at the action constant
    // τ_yaw=τ_c·φ³≈0.254 s — the eyes (τ 0.16 s, eased downstream) lead, the silhouette answers
    // later; release rides the same ease (never a snap). A-LAW 3: the user's dial engagement
    // collapses the target to 0; reduced motion collapses it through motionStrength.
    {const _ayTarget=userYawEngaged?0:attentionYawTargetDeg*attentionYawStrength*Math.max(0,Math.min(1,motionStrength));attentionYawDeg+=(_ayTarget-attentionYawDeg)*(1-Math.exp(-dt/(0.06*AMORPH_PHI*AMORPH_PHI2)));if(Math.abs(attentionYawDeg)<1e-4&&_ayTarget===0)attentionYawDeg=0;}
    // S8 (illustrator-turntable-2p5d-phd-memo): CONTINUOUS travel-facing pursuit
    // at the thrust constant τ·φ²≈0.254 s (same mass as attention). Setpoint is
    // paint yaw on S1 (no 30° quantize, no ±45 fold). NULL feed HOLDS; never-
    // moved load is 0. Reduced motion: nothing feeds — the carrier holds.
    {const _hT=headingYawTargetDeg;let _herr=_hT-headingYawDeg;if(_herr>180)_herr-=360;else if(_herr<-180)_herr+=360;headingYawDeg+=_herr*(1-Math.exp(-dt/(0.06*AMORPH_PHI*AMORPH_PHI2)));if(headingYawDeg>180)headingYawDeg-=360;else if(headingYawDeg<-180)headingYawDeg+=360;if(Math.abs(headingYawDeg)<1e-4&&_hT===0)headingYawDeg=0;}
    const alpha=1-Math.exp(-dt/.30);
    Object.keys(current).forEach(k=>{if(typeof current[k]==='number'&&typeof target[k]==='number')current[k]=lerp(current[k],target[k],alpha);});
    const motionFrameState=composeFixtureMotion(current,(unifiedDynamics&&_lifeFloor<=0.001)?0:(reducedMotion?0:cycleSeconds),(unifiedDynamics&&_lifeFloor<=0.001)?0:Math.max(motionStrength,_lifeFloor)*bodyRestGate); // Unified field owns live substrate; life floor keeps fixture/stars moving after speed<40.
    let frameState=adaptFixtureToEmbodiment(motionFrameState,morphProfileId,nextMorphProfileId,morphMix);
    const expressionRawProgress=transitionProgress(now),automaticEyeTransition=expressionPreviewMode==='automatic'&&transitionFromFixture!==transitionToFixture&&expressionRawProgress<.999,eyeRefractoryFrame=expressionPreviewMode==='refractory'?eyeRefractoryPreview:(automaticEyeTransition?sampleEyeRefractoryArc(transitionFromFixture,transitionToFixture,expressionRawProgress):null);lastEyeRefractoryFrame=eyeRefractoryFrame?{...eyeRefractoryFrame}:null;if(expressionPreviewMode==='automatic'&&expressionRawProgress>=.999)expressionPreviewMode='none';
    // DETERMINISTIC SETTLED HOLD (D-0018): when settled, snapshot the time inputs once and replay
    // them every frame so the body contour + idle transform + face are a pure function of constants
    // -> byte-identical path string -> bit-stable raster (kills the at-rest high-Hz chin/edge buzz
    // at any Hz). Any real event (morphMix>0, a retarget lowering transitionProgress, demo, or a
    // vertex drag) un-holds so motion resumes only as a consequent of that event.
    const _awayFromHome=Math.hypot(worldPoseCurrent.x||0,worldPoseCurrent.z||0)>=8;const _physicsLive=worldPoseTarget.provenance==='physics-authority'||worldPoseTarget.provenance==='life-authority'||worldPoseTarget.provenance==='wander-authority';const _settledNow=morphMix<0.001&&transitionProgress()>=0.999&&!demoMode&&!emotionDemoMode&&dragOrigin===null&&_lifeFloor<=0.001&&!_awayFromHome&&!_physicsLive; // D-0109 A-2: while the life floor is up the settled-hold never engages — the breath cycle keeps advancing at home (the viscoelastic contour inertia still kills high-Hz buzz; D-0018 re-engages exactly as authored the moment the floor returns to 0)
    if(_settledNow&&!bodyHeld){bodyHeld=true;heldFrameState={...frameState};heldCycleSeconds=cycleSeconds;heldIdle={...idle};}
    else if(!_settledNow&&bodyHeld){bodyHeld=false;idleClockOffset+=heldCycleSeconds-elapsed;heldFrameState=null;heldCycleSeconds=null;heldIdle=null;} // D-0109 A-2: rebase the idle clock on release so the breath phase continues from the held phase (no pop when life opens the gate)
    if(bodyHeld){frameState=heldFrameState;if(_lifeFloor<=0.001){cycleSeconds=heldCycleSeconds;idle=heldIdle;}}
    const glowTau=Math.max(.05,.10+(frameState.glowLag||.12));laggedEnergy=lerp(laggedEnergy,frameState.energy,1-Math.exp(-Math.max(.001,dt)/glowTau));familyLight=lerp(familyLight,FAMILY_LIGHT_INTENSITY[emotionFamily]||1,1-Math.exp(-Math.max(.001,dt)/glowTau)); // D-0033 Q3: per-family light lag (same glowTau => 7.3 layer-6 lag, eases on family change, no per-frame pop)
    formExpansion=lerp(formExpansion,FORM_EXPANSION.enabled?(FORM_EXPANSION_FAMILY[emotionFamily]||0):0,1-Math.exp(-Math.max(.001,dt)/FORM_EXPANSION.tau)); // D-0040 V3 (C) whole-form expansion lag (same idiom as familyLight; eases on family change, no per-frame pop; neutral-family target 0 => identity; enabled=false => target 0)
    formTension=lerp(formTension,FORM_TENSION.enabled?(FORM_TENSION_FAMILY[emotionFamily]||0):0,1-Math.exp(-Math.max(.001,dt)/FORM_TENSION.tau)); // D-0041 V3 Layer A whole-form tension lag (same idiom as formExpansion/familyLight; eases on family change, no per-frame pop; neutral-family target 0 => identity; enabled=false => target 0)
    // D-0049 EIGHT-STATE PHYSICAL CHARACTER (M1+M2+M3): ease the per-state body deltas toward the active recipe and
    // compose them ADDITIVELY over the family/fixture layer into the SAME live levers the contour already uses
    // (crown/low/wide :890, _expK :906, _tenK/_tenStiff :886/:907, interior light :1514). Path-independent of the
    // legacy silhouette fence (the recipe lives here in the renderer, NOT in the filtered IR keys). M3 entry gesture:
    // a smoothstep ramp-in (stateMix) over gestureSec + a transient sin(pi.p) crown "beat" (the bulging-morph accent on
    // entry), FROZEN under reduced motion (motionStrength 0 => stateMix snaps to the held posture + beat 0; M6 collapse-
    // to-held). Reversible: eightStateBodyEnabled=false => recipe forced to neutral (all 0) => adding 0 / *1 => identity.
    {const _esbRecipe=eightStateBodyEnabled?(EIGHT_STATE_BODY.recipe[eightStateId]||EIGHT_STATE_BODY.recipe['presence-neutral-settled']):EIGHT_STATE_BODY.recipe['presence-neutral-settled'];
     stateGestureAge+=dt;const _esP=Math.max(0,Math.min(1,stateGestureAge/EIGHT_STATE_BODY.gestureSec)); // D-0049a: integrate gesture age on dt (advances under proof-harness pumping where elapsed is frozen by the !paused gate)
     const _esThree=_esbRecipe.three;let _esMix,_esBPh; // D-0051 M4: per-state 3-beat phrasing (gather->peak->settle) authored from loop-manifest timing; states without a recipe.three keep the proven M3 single-beat path byte-identical (no regression to the six ratified states)
     if(_esThree&&motionStrength>0.001){const _a=stateGestureAge,_g=_esThree.gather,_pk=_esThree.peak,_st=_esThree.settle;if(_a<_g){const _gg=_a/_g;_esMix=_gg*_gg*(3-2*_gg);}else if(_a<_g+_pk){_esMix=1+_esThree.over*Math.sin(Math.PI*(_a-_g)/_pk);}else if(_a<_g+_pk+_st){const _s=(_a-_g-_pk)/_st;_esMix=1+(_esThree.hold-1)*(_s*_s*(3-2*_s));}else{_esMix=_esThree.hold;}_esBPh=Math.max(0,Math.min(1,_a/_g));}else{_esMix=(motionStrength>0.001)?(_esP*_esP*(3-2*_esP)):1;_esBPh=_esP;}
     const _esBeat=(motionStrength>0.001)?Math.sin(Math.PI*_esBPh):0; // D-0051 M4: beat phase = gather-normalized (_esBPh) for 3-beat states so the M3 attack accent fires on entry; _esP for legacy states (unchanged). Frozen under reduced motion (7.1)
     const _esE=1-Math.exp(-Math.max(.001,dt)/EIGHT_STATE_BODY.tau);
     const _esBreath=_esbRecipe.breath;let _bC=0,_bE=0,_bT=0,_bL=0,_bLo=0,_bW=0; // D-0054: per-state characteristic breath (looping micro-motion signature on the state's dominant channel; aperiodic 2-term sum of incommensurate sines per 7.1; gated on motionStrength => frozen under reduced motion; eased in via _esMix so it fades with the gesture entry). INJECTED INTO THE LERP TARGET (not added after) so the zero-mean pulse is tracked through the tau first-order ease = bounded swing (gain<=1) with NO mean drift (the held D-0053 posture is preserved exactly); adding after the lerp would integrate the pulse through the feedback state and shift the held mean (caught + fixed pre-witness)
     if(_esBreath&&motionStrength>0.001){const _bt=stateGestureAge;const _bv=_esBreath.amp*_esMix*(0.6*Math.sin(_bt*_esBreath.hz*6.2832)+0.4*Math.sin(_bt*_esBreath.hz*1.618*6.2832+1.3));if(_esBreath.ch==='crown')_bC=_bv;else if(_esBreath.ch==='expansion')_bE=_bv;else if(_esBreath.ch==='tension')_bT=_bv;else if(_esBreath.ch==='light')_bL=_bv;else if(_esBreath.ch==='low')_bLo=_bv;else if(_esBreath.ch==='wide')_bW=_bv;}
     stateCrown=lerp(stateCrown,_esbRecipe.crown*_esMix+_bC,_esE);
     stateExpansion=lerp(stateExpansion,_esbRecipe.expansion*_esMix+_bE,_esE);
     stateTension=lerp(stateTension,_esbRecipe.tension*_esMix+_bT,_esE);
     stateLight=lerp(stateLight,_esbRecipe.light*_esMix+_bL,_esE);
     stateLow=lerp(stateLow,_esbRecipe.low*_esMix+_bLo,_esE);
     stateWide=lerp(stateWide,_esbRecipe.wide*_esMix+_bW,_esE);
     const _mR=(eightStateBodyEnabled&&EIGHT_STATE_MOUTH.enabled)?(EIGHT_STATE_MOUTH.delta[eightStateId]||EIGHT_STATE_MOUTH.delta['presence-neutral-settled']):EIGHT_STATE_MOUTH.delta['presence-neutral-settled']; // D-0059 V4: per-state mouth-delta target (the five existing levers; no anatomy; no new geometry), gated on the body kill-switch + the mouth kill-switch
     stateMouthCurve=lerp(stateMouthCurve,_mR.curve*_esMix+_lifeWarm*(eightStateId==='presence-neutral-settled'?1:0),_esE); // D-0059: eased with the SAME 3-beat _esMix envelope + tau as the body channels => the mouth enters/settles with the body (holistic agreement); motionStrength 0 => _esMix 1 => held shape persists (reduced-motion-safe). D-0109 A-4: + restWarmth calm half-smile floor at neutral rest (life-scoped, default 0 => byte-identical, same tau ease)
     stateMouthOpen=lerp(stateMouthOpen,_mR.open*_esMix,_esE);
     stateMouthSkew=lerp(stateMouthSkew,_mR.skew*_esMix,_esE);
     stateMouthPullR=lerp(stateMouthPullR,_mR.pullR*_esMix,_esE);
     stateMouthPullL=lerp(stateMouthPullL,_mR.pullL*_esMix,_esE);
     const _popCfg=(globalThis.__GASPER_LIVE_COEFFS__||{}).pop||{};const _popK=(eightStateBodyEnabled&&EIGHT_STATE_POP.enabled)?(_popCfg.popGain??1):0; // D-0061: entry-pop kill-switch + live-coeff gate (default gain 1; =0 => identity)
     if(_popK!==0&&motionStrength>0.001&&_esThree){const _pa=stateGestureAge,_pg=_esThree.gather,_ppk=_esThree.peak;statePop=(_pa>=_pg&&_pa<_pg+_ppk)?(EIGHT_STATE_POP.amp[eightStateId]||0)*Math.sin(Math.PI*(_pa-_pg)/_ppk)*_popK:0;}else{statePop=0;} // D-0061: ANALYTIC half-sine entry pulse confined to the recipe.three peak phase, recomputed from stateGestureAge => BYPASSES the channel tau (the D-0056 attenuation); frozen under reduced motion (motionStrength gate); held posture still carried by the tau-eased _esMix channels
     stateBeat=lerp(stateBeat,_esbRecipe.beat*_esBeat,_esE);
    const _fvGate=(eightStateBodyEnabled&&EIGHT_STATE_FORM_VARIANT.enabled)?(((globalThis.__GASPER_LIVE_COEFFS__||{}).formVariant||{}).formVariantGain??1):0;const _fvT=EIGHT_STATE_FORM_VARIANT.variant[eightStateId]||EIGHT_STATE_FORM_VARIANT.variant['presence-neutral-settled'];fvCrown=lerp(fvCrown,_fvT.crown*_esMix*_fvGate,_esE);fvLow=lerp(fvLow,_fvT.low*_esMix*_fvGate,_esE);fvWide=lerp(fvWide,_fvT.wide*_esMix*_fvGate,_esE);fvAsym=lerp(fvAsym,(_fvT.asym||0)*_esMix*_fvGate,_esE); // D-0066 SLICE A: per-state form-variant targets eased on the SAME body tau (_esE) + 3-beat _esMix envelope as the body channels => the silhouette morphs smoothly to the new variant shape on state change (no snap, §7.2/§8.4) and SETTLES to the held variant (a static shape property). _fvGate = body kill-switch AND formVariant kill-switch AND live-coeff formVariant.formVariantGain (default 1; =0 => target 0 => fv* ease to 0 => identity). motionStrength-independent ease => under reduced motion _esMix=1 + the tau still smooths => the held variant persists (the frozen-distinctness benefit). Neutral + the four identity states have all-zero targets => fv* stay 0 there.
     const _momGate=(eightStateBodyEnabled&&EIGHT_STATE_MOMENTUM.enabled)?(((globalThis.__GASPER_LIVE_COEFFS__||{}).momentum||{}).stateGain??1):0;const _momAmp=EIGHT_STATE_MOMENTUM.amp[eightStateId]||EIGHT_STATE_MOMENTUM.amp['presence-neutral-settled'];stateMomStiff=lerp(stateMomStiff,1+(_momAmp.stiff-1)*_momGate,_esE);stateMomDamp=lerp(stateMomDamp,1+(_momAmp.damp-1)*_momGate,_esE);stateMomGain=lerp(stateMomGain,1+(_momAmp.gain-1)*_momGate,_esE);stateMomLean=lerp(stateMomLean,1+(_momAmp.lean-1)*_momGate,_esE);stateMomTau=lerp(stateMomTau,1+(_momAmp.tau-1)*_momGate,_esE);} // D-0062 per-state momentum/inertia multipliers eased on the body tau (_esE) toward 1+(amp-1)*gate => gate 0 (kill-switch OR stateGain 0) => target 1 => identity; gate 1 => full authored signature. Eased in the body block (runs BEFORE the momentum rig consumes the multipliers at :1589-1607) so the inertia signature is always fresh when the rig integrates. motionStrength-independent ease (a held property of the stance) but the rig INTEGRATION stays motionStrength-gated => reduced-motion-safe
    const flareCycle=Math.floor(elapsed/IDLE_CYCLE_SECONDS); // D-0035 singularity deep-internal flare: SPARSE + APERIODIC + 7.3-lagged intensity event (brief 5), NOT a periodic throb (7.1). Driven by elapsed (real time) NOT cycleSeconds: cycleSeconds is pinned by the D-0018 settled-hold (bodyHeld) which would freeze the flare in the held singularity, but brief 5 fires WHILE HELD. Body contour + face + idle transform stay pinned/bit-stable (D-0018 protected objects, no buzz); only the dormant internal-light opacities get this slow sparse living undercurrent (brief 2: not switched off).
    const flareHash=(n)=>((Math.sin(n)*43758.5453)%1+1)%1; // deterministic per-cycle hash (DET-001 reproducible; same idiom as idleCycleAt)
    const flareActive=flareHash(flareCycle*127.1)<SINGULARITY_FLARE.chance; // ~20% of 8s cycles host a flare => mean quiet interval ~40s (tens of seconds), jittered/aperiodic
    const flarePeak=SINGULARITY_FLARE.peakLo+(SINGULARITY_FLARE.peakHi-SINGULARITY_FLARE.peakLo)*flareHash(flareCycle*311.7); // jittered peak phase within the cycle
    const flareDist=Math.abs((elapsed/IDLE_CYCLE_SECONDS)-flareCycle-flarePeak);
    const flareTarget=(flareActive&&flareDist<SINGULARITY_FLARE.halfWindow&&motionStrength>0.001)?1:0; // gated by motionStrength => freezes under reduced motion (cycleSeconds pinned + motionStrength 0)
    const flareTau=flareTarget>singularityFlare?SINGULARITY_FLARE.gatherTau:SINGULARITY_FLARE.recoverTau;
    singularityFlare=lerp(singularityFlare,flareTarget,1-Math.exp(-Math.max(.001,dt)/flareTau)); // asymmetric lag: slow gather (brighten) + longer recovery (light settles after, 5.4)
    const svgStarted=performance.now(),topologyStarted=performance.now();
    const anchorsA=createFaceSurfaceAnchorsFor(morphProfileId),semanticContourA=sampleBodyForProfile(morphProfileId,frameState,reducedMotion?0:cycleSeconds),meshA=distributedMeshPointsFor(semanticContourA,morphProfileId,frameState,anchorsA),ptsA=applyMeshWarp(semanticContourA,meshA);
    let semanticContour=ptsA,mesh=meshA,pts=ptsA,activeFaceAnchors=createFaceSurfaceAnchorsFor(morphProfileId),formProfile=FORM_PROFILES[morphProfileId];
    if(morphMix>0.0001){
      const anchorsB=createFaceSurfaceAnchorsFor(nextMorphProfileId),semanticContourB=sampleBodyForProfile(nextMorphProfileId,frameState,reducedMotion?0:cycleSeconds),meshB=distributedMeshPointsFor(semanticContourB,nextMorphProfileId,frameState,anchorsB),ptsB=applyMeshWarp(semanticContourB,meshB);
      semanticContour=blendPointSets(semanticContourA,semanticContourB,morphMix);mesh=blendPointSets(meshA,meshB,morphMix);pts=blendPointSets(ptsA,ptsB,morphMix);activeFaceAnchors=blendFaceAnchors(createFaceSurfaceAnchorsFor(morphProfileId),createFaceSurfaceAnchorsFor(nextMorphProfileId),morphMix);formProfile=blendProfiles(FORM_PROFILES[morphProfileId],FORM_PROFILES[nextMorphProfileId],morphMix);
    }
    // D-0029: one route-sensitive affine moves shell, material topology, face anchors,
    // dormant optics, and contact geometry together. Commitment remains monotonic;
    // only the separate residual settles, so no endpoint reversal or topology swap.
    const morphPhysics=morphArc?refractoryMorphTransform(morphProfileId,nextMorphProfileId,morphArc):null;
    if(morphPhysics){semanticContour=applyRefractoryPointSet(semanticContour,morphPhysics);mesh=applyRefractoryPointSet(mesh,morphPhysics);pts=applyRefractoryPointSet(pts,morphPhysics);activeFaceAnchors=applyRefractoryAnchors(activeFaceAnchors,morphPhysics);}
    pts=applyFabricSnap(pts,formProfile);
    semanticContour=applyFabricSnap(semanticContour,formProfile);
    let _dgNorm=0;if(DEPTH_GLOW.enabled&&mesh&&mesh.length){let _dgMin=1e9,_dgMax=-1e9;for(const _p of mesh){const _d=_p.projectedDepth||0;if(_d<_dgMin)_dgMin=_d;if(_d>_dgMax)_dgMax=_d;}const _rng=(_dgMax-_dgMin)||0;_dgNorm=Math.min(1,Math.max(0,_rng/DEPTH_GLOW.ref));avatar.dataset.v3DepthRange=_rng.toFixed(4);}else{avatar.dataset.v3DepthRange='0.0000';}depthGlow=lerp(depthGlow,_dgNorm,1-Math.exp(-Math.max(.001,dt)/DEPTH_GLOW.tau)); // D-0040 V3 (A) depth-shaped interior light: ease toward the body's own projectedDepth RANGE — computed HERE (pre-smoothing) because the V2.4 viscoelastic smoothing below low-passes x/y only (D-0071 restored full metadata passthrough after the {x,y}-only strip emptied the galaxy flecks + depth range). yaw 0 => projectedDepth:0 (:906) => range 0 => depthGlow 0 => identity (S1 yaw-0 non-regression). enabled=false => _dgNorm 0. v3DepthRange = raw mesh depth range (debug observable).
    // V2.4 VISCOELASTIC CONTOUR INERTIA (D-0018): temporal low-pass on the body contour + mesh so the
    // per-frame micro-jitter that flipped the razor chin cusp's raster row at panel rate (Cody's ~80 Hz
    // tremble) is removed at the source, while the slow intended motion (breath / eased retargets /
    // walk / morphs) still passes. A viscoelastic mass cannot buzz at 80 Hz — this gives it that inertia.
    // Identity-preserving: the sharp cleft/foot shapes stay; only the per-frame DELTA is damped (tau 0.25s
    // => ~15x less per-frame movement; a razor edge moving <0.1px/frame can no longer flip a pixel row
    // every frame). The face (eyes/mouth) is NOT smoothed, so expression stays snappy. Snaps while a
    // vertex is being dragged so sculpting stays responsive. D-0071: the low-pass owns ONLY x/y — all
  // other point properties (index/radius/theta/projectedDepth/sourceX/sourceY) pass through from the current
  // raw point each frame (the {x,y}-only rebuild had silently emptied renderCosmicFlecks + depth telemetry).
    {
      const VISCO_TAU_PLANT = 0.02;
      const VISCO_TAU_SWING = 0.07;
      const VISCO_TAU_REST = 0.42;
      const S=globalThis.__GASPER_STANCE__||{};
      const restHold=(!S.live||S.live<0.004)?1:0;
      if(!restHold&&!stanceWasLive) globalThis.__GASPER_VISCO_SNAP__=1;
      stanceWasLive=!restHold;
      const _side=Number(S.side)||Number(physGait&&physGait.supportSide)||0;
      const _gaitLive=restHold?0:1;
      const _gatePlant=_gaitLive>0.004&&_side!==0;
      const snap=globalThis.__GASPER_VISCO_SNAP__;
      if(snap) globalThis.__GASPER_VISCO_SNAP__=0;
      const _lp=(prev,raw)=>{
        const GN=globalThis.__GASPER_GEONODES_EVAL__||{};
        if(GN.mute&&GN.mute.voigt) return raw;
        if(!prev||prev.length!==raw.length||dragOrigin!==null||snap){
          return raw.map(p=>({...p}));
        }
        for(let i=0;i<prev.length;i++){
          const r=raw[i], th=r.th??r.theta??0;
          const _chinKeep=gaussAngle(th,Math.PI/2,0.18);
          const _lower=Math.min(1,Math.max(0,Math.sin(th)-0.20)/0.80);
          const _thPlant=_side>0?1.31:1.83;
          const w=gaussAngle(th,_thPlant,0.16)*(1-_chinKeep)*_lower;
          const wL=gaussAngle(th,1.83,0.14)*(1-_chinKeep)*_lower;
          const wR=gaussAngle(th,1.31,0.14)*(1-_chinKeep)*_lower;
          const tauL=Number(S.left&&S.left.tau)||VISCO_TAU_PLANT;
          const tauR=Number(S.right&&S.right.tau)||VISCO_TAU_SWING;
          const ww=wL+wR;
          const stanceTau=ww>1e-4?(tauL*wL+tauR*wR)/ww:VISCO_TAU_SWING;
          const gated=viscoTau+w*(VISCO_TAU_PLANT-viscoTau);
          const tauLower=Number(GN.params&&GN.params.voigt&&GN.params.voigt.tau)||0.05;
          const tau=restHold?VISCO_TAU_REST:(_lower>0.12&&S.live?tauLower:(1-restHold)*(ww>0.05?stanceTau:gated));
          const TF=globalThis.__GASPER_TAU_FIELD__;
          let tauUse=tau;
          if(TF){
            const v=Math.min(1,Math.max(0,(Math.sin(th)+1)*0.5));
            const tc=Number(TF.crown),tw=Number(TF.waist),tf=Number(TF.foot);
            if(Number.isFinite(tc)&&Number.isFinite(tw)&&Number.isFinite(tf)){
              const field=v<0.5?tc+(tw-tc)*(v/0.5):tw+(tf-tw)*((v-0.5)/0.5);
              tauUse=(_lower>0.12&&S.live)?Math.min(field,tau):field;
            }
          }
          const sa=1-Math.exp(-dt/Math.max(0.02,tauUse||VISCO_TAU_SWING));
          prev[i].x+=(r.x-prev[i].x)*sa;
          prev[i].y+=(r.y-prev[i].y)*sa;
          for(const k in r){if(k!=='x'&&k!=='y')prev[i][k]=r[k];}
        }
        return prev;
      };
      smoothPts=_lp(smoothPts,kappaBoxLower(pts,S)); smoothMesh=_lp(smoothMesh,mesh); pts=kappaBoxLower(smoothPts,S); mesh=smoothMesh;
    }
    const singularityWeight=profileWeight(morphProfileId,nextMorphProfileId,morphMix,'singularity');
    const orbitWeight=profileWeight(morphProfileId,nextMorphProfileId,morphMix,'dormant-orbit');
    const dormantFamilyWeight=Math.max(0,Math.min(1,singularityWeight+orbitWeight));
    const settleCross=singularityWeight>SINGULARITY_SETTLE.cross&&prevSingWeight<=SINGULARITY_SETTLE.cross; // D-0036 singularity entry compression-settle (brief 5 beat 1): rising-edge detect entry completion (singularityWeight crossing UP through cross). One-shot per entry, NOT periodic (7.1).
    if(settleCross&&motionStrength>0.001)singularitySettle=1; // impulse the envelope (gated by motionStrength => freezes the accent under reduced motion; the plain morph settle still happens, only the breath-scale accent is quieted)
    singularitySettle=lerp(singularitySettle,0,1-Math.exp(-Math.max(.001,dt)/SINGULARITY_SETTLE.tau)); // monotonic ease-back to the held seed (target 0); no re-trigger until singularityWeight drops below cross and re-enters
    const recognitionCross=prevSingWeight>RECOGNITION_SPARK.cross&&singularityWeight<=RECOGNITION_SPARK.cross; // D-0037 singularity exit recognition accent (brief 5 beat 3): FALLING-edge detect the being leaving the seed (singularityWeight crossing DOWN through cross~0.5 = morphMix~0.52 = face re-emergence onset). One-shot per exit, NOT periodic (7.1). Mirror of the D-0036 rising-edge entry settle.
    if(recognitionCross&&motionStrength>0.001)recognitionSpark=1; // impulse the recognition envelope (gated by motionStrength => freezes the accent under reduced motion; the plain morph exit still happens)
    recognitionSpark=lerp(recognitionSpark,0,1-Math.exp(-Math.max(.001,dt)/RECOGNITION_SPARK.tau)); // monotonic ease-back to 0 (held presence byte-identical); no re-trigger until the being re-enters singularity and leaves again
    if(recognitionCross&&motionStrength>0.001)gazeViewerSettle=1; // D-0038 singularity exit gaze settle-on-viewer (brief 3 exit + packet 4 Q2 half): the GAZE half of the wake recognition accent, companion of the D-0037 light spark. SAME one-shot falling-edge impulse (recognitionCross above). One-shot per exit, NOT a periodic pulse/stare (7.1). Gated by motionStrength => freezes under reduced motion.
    gazeViewerSettle=lerp(gazeViewerSettle,0,1-Math.exp(-Math.max(.001,dt)/GAZE_VIEWER_SETTLE.tau)); // dt-driven monotonic ease-back to 0 (works paused; held presence gaze byte-identical); no re-trigger until the being re-enters singularity and leaves again
    if(recognitionCross&&motionStrength>0.001)recognitionPop=1; // D-0041 V3 Layer A recognition MASS-pop: SAME one-shot falling-edge impulse as the D-0037 light spark + D-0038 gaze settle, so the WHOLE MASS swells with the "aha" (brief §5 Layer A: recognition -> brief expansion pop then settle). One-shot per exit, NOT periodic (7.1). Gated by motionStrength => freezes under reduced motion.
    recognitionPop=lerp(recognitionPop,0,1-Math.exp(-Math.max(.001,dt)/RECOGNITION_POP.tau)); // monotonic ease-back to 0 (the pop settles); no re-trigger until the being re-enters singularity and leaves again
    prevSingWeight=singularityWeight;
    const cometWeight=profileWeight(morphProfileId,nextMorphProfileId,morphMix,'comet');
    const lowOrbitWeight=profileWeight(morphProfileId,nextMorphProfileId,morphMix,'low-orbit');
    const wispwalkerWeight=profileWeight(morphProfileId,nextMorphProfileId,morphMix,'wispwalker');
    // GASPER-FINISH-01 / VEC-101: bounded face visibility. When the packaged
    // mount installed the typed no-blackout policy, face visibility resolves
    // through it: dormant/singularity routes get an explicit bounded reduction
    // (face nodes retained, opacity floored) instead of the legacy face:false
    // hard withdrawal to zero. Standalone fallback keeps legacy behavior.
    const _fvPolicy=globalThis.__GASPER_FACE_VISIBILITY_POLICY__;
    let faceVisibility,faceEmissionVisibility;
    if(_fvPolicy&&typeof _fvPolicy.resolve==='function'){
      const _fromFace=!!FORM_PROFILES[morphProfileId].face,_toFace=!!FORM_PROFILES[nextMorphProfileId].face;
      const _routeHint=(!_fromFace&&_toFace)?'wake':(!_toFace?'dormant':'ordinary');
      const _fv=_fvPolicy.resolve({progress:morphMix,fromFace:_fromFace,toFace:_toFace,routeHint:_routeHint});
      faceVisibility=_fv.faceVis;
      faceEmissionVisibility=_fv.emissionOp;
    }else{
      faceVisibility=lerp(profileFaceWeight(morphProfileId),profileFaceWeight(nextMorphProfileId),morphMix);
      if(nextMorphProfileId==='singularity'&&FORM_PROFILES[morphProfileId].face)faceVisibility*=1-smoothstep(.12,.48,morphMix);
      if(morphProfileId==='singularity'&&FORM_PROFILES[nextMorphProfileId].face)faceVisibility*=smoothstep(.52,.88,morphMix);
      faceEmissionVisibility=faceVisibility;
    }
    // S8 (radial-facing-phd-memo, N39) + GASPER-MAT-005: the face recedes
    // through the shoulder and is fully absent on the dorsal hemisphere. The
    // single semantic visibility scalar gates recess/emission AND face-authored
    // material light, so optical readability floors cannot resurrect a rear face.
    let faceTurnVisibility=1;{const _vmF=getViewMetrics(formProfile);const _fade=Math.max(0,Math.min(1,_vmF.faceTurnFade));faceTurnVisibility=1-_fade;faceVisibility*=faceTurnVisibility;faceEmissionVisibility*=faceTurnVisibility;avatar.style.setProperty('--face-turn-visibility',faceTurnVisibility.toFixed(4));avatar.dataset.facingFaceVisibility=faceTurnVisibility.toFixed(4);}
    const shellOpacity=lerp(profileShellOpacity(morphProfileId),profileShellOpacity(nextMorphProfileId),morphMix);
    const dynamicFaceTransform=viewFaceTransform(formProfile,morphPhysics);faceRecessLayer.setAttribute('transform',dynamicFaceTransform);faceEmissionLayer.setAttribute('transform',dynamicFaceTransform);expressionShellLayer.setAttribute('transform',dynamicFaceTransform);expressionOcclusionLayer.setAttribute('transform',dynamicFaceTransform);
    // Same-frame atomic commit: embodiment mix, face recess/emission opacity,
    // and the semantic labels (dataset writes below) all derive from the one
    // resolved morphMix of this frame inside the projection transaction.
    faceRecessLayer.style.opacity=faceVisibility.toFixed(3);faceEmissionLayer.style.opacity=faceEmissionVisibility.toFixed(3);chromaticShell.setAttribute('opacity',shellOpacity.toFixed(3));
    const lobeVisibility=Math.max(0,1-lowOrbitWeight-.68*cometWeight);containedLobeMaterial.setAttribute('opacity',lobeVisibility.toFixed(3));exteriorAuraLayer.setAttribute('opacity',(lobeVisibility*.34).toFixed(3));
    avatar.dataset.formProfile=morphMix<.5?morphProfileId:nextMorphProfileId;avatar.dataset.morphFrom=morphProfileId;avatar.dataset.morphTo=nextMorphProfileId;avatar.dataset.morphMix=morphMix.toFixed(4);avatar.dataset.morphRawProgress=(morphArc?.rawProgress??morphMix).toFixed(4);avatar.dataset.morphPhase=morphArc?.phase||'manual';avatar.dataset.morphResidual=(morphArc?.residual||0).toFixed(5);avatar.dataset.morphScaleX=(morphPhysics?.sx??1).toFixed(5);avatar.dataset.morphScaleY=(morphPhysics?.sy??1).toFixed(5);avatar.dataset.morphTranslateX=(morphPhysics?.tx??0).toFixed(4);avatar.dataset.morphTranslateY=(morphPhysics?.ty??0).toFixed(4);avatar.dataset.morphRotation=(morphPhysics?.rotation??0).toFixed(4);avatar.dataset.morphRouteDistance=(morphPhysics?.routeDistance??0).toFixed(5);avatar.dataset.morphChirality=String(morphPhysics?.chirality??0);avatar.dataset.eyeRefractoryMode=expressionPreviewMode;avatar.dataset.eyeRefractoryPhase=eyeRefractoryFrame?.phase||'idle';avatar.dataset.eyeRefractoryRawProgress=(eyeRefractoryFrame?.rawProgress??1).toFixed(4);avatar.dataset.eyeRefractoryResidual=(eyeRefractoryFrame?.residual||0).toFixed(5);avatar.dataset.eyeRefractoryEnvelope=(eyeRefractoryFrame?.settleEnvelope||0).toFixed(5);avatar.dataset.eyeApertureScaleL=(eyeRefractoryFrame?.apertureScaleL??1).toFixed(5);avatar.dataset.eyeApertureScaleR=(eyeRefractoryFrame?.apertureScaleR??1).toFixed(5);avatar.dataset.eyeWidthScaleL=(eyeRefractoryFrame?.widthScaleL??1).toFixed(5);avatar.dataset.eyeWidthScaleR=(eyeRefractoryFrame?.widthScaleR??1).toFixed(5);
    frameMetrics.topologyMs.push(performance.now()-topologyStarted);
    // GASPER-MAT-005 / CanonOps VM1-VM3: temporal body-space memory must
    // never be mutated by view projection. Clone BOTH the contour and the
    // structural material mesh, then resolve one final post-facing render frame.
    pts=pts.map(p=>({...p}));
    const renderMesh=(mesh||[]).map(p=>({...p}));
    // N36 / Wave 3 retirement integrity: velocity-wake contour deformation is
    // removed, not disabled. The compatibility intake remains a no-op below.
    avatar.dataset.wakeStretch='0.000';
    // Finite-thickness yaw is one shared posture map for shell + material mesh.
    // GASPER-MAT-006: resolve the composed radial yaw once from the same metrics
    // object that owns final contour projection, then thread that scalar through
    // every material/light consumer in this frame. No downstream dial rereads.
    const _vmT=getViewMetrics(formProfile);
    const facingYawDeg=_vmT.effectiveYaw;
    const materialFacingYawDeg=facingYawDeg;
    {const _hK=_vmT.facingCompress;if(pts.length&&Math.abs(_hK-1)>1e-12){let _tcx=0;for(const p of pts){_tcx+=p.x;}_tcx/=pts.length;for(const p of pts){const _rx=p.x-_tcx;p.x=_tcx+_rx*_hK;}for(const p of renderMesh){const _rx=p.x-_tcx;p.x=_tcx+_rx*_hK;}}avatar.dataset.facingCompress=_vmT.facingCompress.toFixed(4);avatar.dataset.facingVerticalScale='1.0000';avatar.dataset.facingFaceFade=_vmT.faceTurnFade.toFixed(4);avatar.dataset.materialFacingYaw=materialFacingYawDeg.toFixed(2);avatar.dataset.nearLobeScale=_vmT.nearLobeScale.toFixed(4);avatar.dataset.farLobeScale=_vmT.farLobeScale.toFixed(4);}
    // VM3: normals/light are evaluated from the geometry that is actually painted.
    const normalStarted=performance.now(),normals=computeNormals(pts);
    frameMetrics.normalMs.push(performance.now()-normalStarted);
    const _lrG=LIGHT_RIG.enabled?Math.max(0,Math.min(1,Number((((globalThis.__GASPER_LIVE_COEFFS__||{}).lightRig||{}).lightRigGain??1))||0)):0;
    let _lrFrame=null;
    if(_lrG!==0){
      const _lrStarted=performance.now();
      lastLightRigInput={yaw:materialFacingYawDeg,profile:formProfile,mesh:renderMesh,pts,normals};
      _lrFrame=LightRig.evalFrame(lastLightRigInput,dt);
      frameMetrics.lightRigMs.push(performance.now()-_lrStarted);
    }else{LightRig.reset();frameMetrics.lightRigMs.push(0);}
    if(_lrFrame){
      const _g=Math.max(0,Math.min(1,_lrFrame.score));
      const _glintR=4+6*_g;
      const _sheenR=22+14*_g;
      tssGlintNode.setAttribute('cx',_lrFrame.glint.x.toFixed(2));
      tssGlintNode.setAttribute('cy',_lrFrame.glint.y.toFixed(2));
      tssGlintNode.setAttribute('r',_glintR.toFixed(2));
      tssGlintNode.setAttribute('opacity',(0.55*_g*_lrG).toFixed(3));
      tssSheenNode.setAttribute('cx',_lrFrame.sheen.x.toFixed(2));
      tssSheenNode.setAttribute('cy',_lrFrame.sheen.y.toFixed(2));
      tssSheenNode.setAttribute('r',_sheenR.toFixed(2));
      tssSheenNode.setAttribute('opacity',(0.18*_g*_lrG).toFixed(3));
      avatar.dataset.lightRigGain=_lrG.toFixed(4);
      avatar.dataset.lightRigGlintX=_lrFrame.glint.x.toFixed(2);
      avatar.dataset.lightRigGlintY=_lrFrame.glint.y.toFixed(2);
      avatar.dataset.lightRigGlintScore=_lrFrame.score.toFixed(4);
      avatar.dataset.lightRigGlintIndex=String(_lrFrame.glintIndex);
      avatar.dataset.lightRigSheenX=_lrFrame.sheen.x.toFixed(2);
      avatar.dataset.lightRigSheenY=_lrFrame.sheen.y.toFixed(2);
      avatar.dataset.lightRigRimAvg=_lrFrame.rimAvg.toFixed(4);
    }else{
      tssGlintNode.setAttribute('opacity','0');
      tssSheenNode.setAttribute('opacity','0');
      avatar.dataset.lightRigGain='0.0000';
      avatar.dataset.lightRigGlintX='0.00';
      avatar.dataset.lightRigGlintY='0.00';
      avatar.dataset.lightRigGlintScore='0.0000';
      avatar.dataset.lightRigGlintIndex='-1';
      avatar.dataset.lightRigSheenX='0.00';
      avatar.dataset.lightRigSheenY='0.00';
      avatar.dataset.lightRigRimAvg='0.0000';
    }
    avatar.dataset.materialCoordinateFrame='post-facing';
    avatar.dataset.materialCoordinateRevision=String(organismFrame.frameIndex||0);
    pts=bindHullToLiveGrid(pts);
    const wpts=pts;
    const bodyD=closedSpline(wpts),clipD=closedSpline(pts);lastPoints=pts;lastMeshPoints=renderMesh;body.setAttribute('d',bodyD);clipBody.setAttribute('d',clipD);
    const key=ribbonFromAnchors(pts,normals,KEY_ANCHORS,[-.72,-.69],5.5,12.5,7.2,16),core=ribbonFromAnchors(pts,normals,KEY_ANCHORS,[-.72,-.69],8.8,12.4,2.8,7.2),fill=ribbonFromAnchors(pts,normals,FILL_ANCHORS,[.88,-.46],8,11,3.2,7.2);
    const keyD=ribbonPath(key.outer,key.inner),fillD=ribbonPath(fill.outer,fill.inner);keyCore.setAttribute('d',ribbonPath(core.outer,core.inner));fillHalo.setAttribute('d',fillD);fillBand.setAttribute('d',fillD);
    const rimD=openSpline(centerlineFromAnchors(pts,normals,RIM_ANCHORS,[.76,.65],1,2)),bounceD=openSpline(centerlineFromAnchors(pts,normals,BOUNCE_ANCHORS,[0,-1],5.5,2.8));
    rim.setAttribute('d',rimD);bounce.setAttribute('d',bounceD);if(rimOuter)rimOuter.setAttribute('d',rimD);if(bounceOuter)bounceOuter.setAttribute('d',bounceD);

    renderAccretionDisc(pts,formProfile,idle,motionStrength,{singularity:singularityWeight,orbit:orbitWeight});



    renderMaterialRig(pts,normals,renderMesh,activeFaceAnchors,organismFrame,faceTurnVisibility,materialFacingYawDeg);
    renderAdaptiveRelief(pts,formProfile);
    paintSurfaceShade(formProfile);
    paintScaffoldGrid(pts,formProfile);
    muteHardHighlights();
    renderRestingFascia(pts,normals,formProfile,organismFrame); // D-0040 V3 (B) resting fascia coherence (neutral only; zero rim; C4-05 safe; reversible via FASCIA.enabled)
    // GASPER-009 C5 SINGULARITY SCAFFOLD COMPOSITION (V6 dormant embodiment): the singularity's silhouette
    // is authored as a scaffold z-displacement (the same geometry authority as the living body), composed
    // ADDITIVELY into the published z-buffer AFTER the relief pipe above so it is the frame's final word —
    // the contour coupling (scaffoldContourZ) reads it next frame and the singularity shares the living
    // body's single geometry authority. Gated on singularityWeight>0: presence/wispwalker/everything else
    // publish nothing here, so their silhouettes are unchanged. The face stays absent on singularity
    // (FORM_PROFILES face:false + the faceVisibility singularity gate above). Static => reduced-motion safe.
    if(singularityWeight>0){const _seedZ=singularityScaffoldZ('singularity',singularityWeight),_buf=globalThis.__GASPER_SCAFFOLD_Z__;if(_buf&&_buf.length===_seedZ.length){for(let _i=0;_i<_seedZ.length;_i++)_buf[_i]+=_seedZ[_i];}}
    applyViewLobeParallax(formProfile);
    const eyeLOffset=resolveFaceAnchorOffset(activeFaceAnchors.eyeL),eyeROffset=resolveFaceAnchorOffset(activeFaceAnchors.eyeR),mouthOffset=resolveFaceAnchorOffset(activeFaceAnchors.mouth),viewMetrics=getViewMetrics(formProfile);
    // N3 EYE-SEIZURE: under live-loop authority, low-pass the eye SHAPE channels so the
    // per-frame applySemanticPose<->geometric-blend race cannot shimmer width/tilt/lift.
    // Aperture is handled separately from externalEyeAperture below. Off authority (reduced
    // motion / scrub) the shipped frameState path is used unchanged.
    let eyeShape;
    if(externalBlinkAuthority){
      if(!eyeShapeSmoothSeeded){eyeShapeSmooth.wL=frameState.eyeWidthL||1;eyeShapeSmooth.wR=frameState.eyeWidthR||1;eyeShapeSmooth.tL=frameState.eyeTiltL||0;eyeShapeSmooth.tR=frameState.eyeTiltR||0;eyeShapeSmooth.liftL=frameState.eyeLiftL||0;eyeShapeSmooth.liftR=frameState.eyeLiftR||0;eyeShapeSmoothSeeded=true;}
      const sa=1-Math.exp(-dt/0.30);
      eyeShapeSmooth.wL+=((frameState.eyeWidthL||1)-eyeShapeSmooth.wL)*sa;eyeShapeSmooth.wR+=((frameState.eyeWidthR||1)-eyeShapeSmooth.wR)*sa;eyeShapeSmooth.tL+=((frameState.eyeTiltL||0)-eyeShapeSmooth.tL)*sa;eyeShapeSmooth.tR+=((frameState.eyeTiltR||0)-eyeShapeSmooth.tR)*sa;eyeShapeSmooth.liftL+=((frameState.eyeLiftL||0)-eyeShapeSmooth.liftL)*sa;eyeShapeSmooth.liftR+=((frameState.eyeLiftR||0)-eyeShapeSmooth.liftR)*sa;
      eyeShape={eyeWidthL:eyeShapeSmooth.wL,eyeWidthR:eyeShapeSmooth.wR,eyeTiltL:eyeShapeSmooth.tL,eyeTiltR:eyeShapeSmooth.tR,eyeLiftL:eyeShapeSmooth.liftL,eyeLiftR:eyeShapeSmooth.liftR};
    }else{eyeShape=frameState;eyeShapeSmoothSeeded=false;}
    const faceProjection=SidekickFacePlane.projectFacePlane(FACE_PLANE,{yawDegrees:effectiveViewYaw(),anchorShift:viewMetrics.faceShift,compression:viewMetrics.faceCompression,offsets:{leftEye:[0,-eyeShape.eyeLiftL],rightEye:[0,-eyeShape.eyeLiftR],mouth:[0,0]}}); // S5: the face rides the body — attention yaw turns the face plane with the silhouette (the sign-safe deformation lives in authorKeyViewPoint/projectFacePlane inputs)
    renderFeatureRelief(pts,formProfile,faceProjection,faceVisibility,morphProfileId); // VEC-201 analytic feature bas-relief (logo/glasses + embodiment) on DETAIL_TOPOLOGY; pure vector primitives; intensity-only, outside the guarded face block
    const eyeWidthScale=formProfile.eyeWidthScale||1,eyeOpenScale=formProfile.eyeOpenScale||1,mouthYShift=formProfile.mouthYShift||0,mouthScale=formProfile.mouthScale||1,mouthOpenScale=formProfile.mouthOpenScale||1;
    const _ib=externalBlinkAuthority?0:idle.blink; // N1: silence rogue internal blink on live loop
    // FIELD ARCHITECTURE PHASE 1: the expression model's morphed per-eye aperture
    // (frameState.eyeOpenL/R, smoothed by the internal lerp) is the BASE LAYER; the
    // TS loop's externalEyeAperture is a MULTIPLICATIVE blink envelope on top. The
    // eyes now morph with the body and carry the 18-fixture authored per-eye values
    // (asymmetry, tilt, lift, width) even during transitions. N3 race fix preserved:
    // the envelope still comes from the single clean TS source, not the raced path.
    let eyeOpenL,eyeOpenR;
    if(externalBlinkAuthority&&externalEyeAperture!=null){
      // D-0067 (F1): calm the OPEN-EYE BASE aperture (low-pass + snap dead-zone). Passes the slow alive-band
      // wave (<~2-3Hz) and intentional steps; swallows the ~15-30Hz race jitter. Mirrors eyeShapeSmooth (:1497).
      const _ecG=EYE_APERTURE_CALM.enabled?(((globalThis.__GASPER_LIVE_COEFFS__||{}).eyeCalm||{}).eyeCalmGain??1):0;
      if(_ecG!==0){
        if(!eyeApertureSmoothSeeded){eyeApertureSmooth.oL=frameState.eyeOpenL;eyeApertureSmooth.oR=frameState.eyeOpenR;eyeApertureEnv=externalEyeAperture;eyeApertureErrL=0;eyeApertureErrR=0;eyeApertureSmoothSeeded=true;}
        const _oa=1-Math.exp(-dt/EYE_APERTURE_CALM.tau);
        eyeApertureSmooth.oL+=(frameState.eyeOpenL-eyeApertureSmooth.oL)*_oa;
        eyeApertureSmooth.oR+=(frameState.eyeOpenR-eyeApertureSmooth.oR)*_oa;
        // S7a (N36): ONE-DIRECTIONAL hysteresis snap — snap only while the error is SHRINKING
        // (converging hold); a target that moves away is never snapped, so a jittering input
        // cannot alternate raw<->eased frame to frame (the frame-verified chatter mechanism).
        const _dL=Math.abs(frameState.eyeOpenL-eyeApertureSmooth.oL),_dR=Math.abs(frameState.eyeOpenR-eyeApertureSmooth.oR);
        if(_dL<EYE_APERTURE_CALM.deadZone&&_dL<=eyeApertureErrL)eyeApertureSmooth.oL=frameState.eyeOpenL;
        if(_dR<EYE_APERTURE_CALM.deadZone&&_dR<=eyeApertureErrR)eyeApertureSmooth.oR=frameState.eyeOpenR;
        eyeApertureErrL=_dL;eyeApertureErrR=_dR;
      }else{eyeApertureSmoothSeeded=false;}
      const _baseL=_ecG!==0?eyeApertureSmooth.oL:frameState.eyeOpenL, _baseR=_ecG!==0?eyeApertureSmooth.oR:frameState.eyeOpenR;
      // S7a (N36): the blink envelope is the chatter carrier (per-frame multiplicative jitter).
      // Calm it with its own fast low-pass (envelopeTau 0.05 — a 0.1s blink close still reads
      // ballistic; the 2-3-frame eye wobble is what dies here).
      eyeApertureEnv+=((externalEyeAperture-eyeApertureEnv)*(1-Math.exp(-dt/EYE_APERTURE_CALM.envelopeTau)));
      const blinkEnv=Math.max(0.05,Math.min(1.2,eyeApertureEnv*1.08)); // crisp blink envelope, applied AFTER the ease
      eyeOpenL=_baseL*blinkEnv*eyeOpenScale;eyeOpenR=_baseR*blinkEnv*eyeOpenScale;
    }
    else{eyeApertureSmoothSeeded=false;eyeOpenL=frameState.eyeOpenL*eyeOpenScale*(1-_ib*.92);eyeOpenR=frameState.eyeOpenR*eyeOpenScale*(1-_ib*.92);}
    // V2.7 LIVING GAZE update (D-0024): deterministic aperiodic attention. On schedule, pick a target
    // (mostly calm center; occasionally a glance to a point of interest), dwell, return to center, and
    // ease current toward target (fast smooth pursuit — the eyes lead, §6.4). Incommensurate timing (§8.1).
    const gazeAmp=gazeAmpLive,gazeLife=Math.max(0,Math.min(1,motionStrength))*gazeAmp; let gazeRecog=0;
    if(gazeLife>0.001){
      const gNow=elapsed;
      if(gNow>=gazeNextAt){
        gazeIdx++;const i=gazeIdx,sd=(frameState.microSeed||1);
        const a=Math.sin(i*2.399963+sd*1.7),b=Math.sin(i*1.313+sd*0.9),cc=Math.sin(i*0.731+sd*2.3);
        // ~65% glance out to a point of interest; ~35% rest at calm center (availability, §3.2). The
        // glance amplitude is sized to read as an unmistakable look, not a sub-pixel drift.
        if(a>0.40){ gazeTX=0;gazeTY=0; gazeHoldUntil=gNow+0.5+0.7*((b+1)*0.5); }
        else{ const dir=b>0?1:-1; gazeTX=dir*(5.5+3.0*(cc*0.5+0.5)); gazeTY=Math.sin(i*1.7+sd)*2.2; gazeHoldUntil=gNow+0.5+0.9*((a+1)*0.5);
          // REFRACTORY ORIENT (D-0025): arm the recognition settle — after the eyes arrive (~0.3s pursuit
          // + the consciousness-catches-up gap), a brief recognition beat (the "aha") before relaxing.
          gazeRecogStart=gNow+0.34; gazeRecogEnd=gazeRecogStart+0.55; }
        gazeNextAt=gazeHoldUntil+(0.4+1.1*(0.5+0.5*Math.sin(i*1.039+sd*0.5)));
      }
      if(gNow>=gazeHoldUntil){ gazeTX=0;gazeTY=0; }
       const gp=1-Math.exp(-dt/0.13); gazeX+=(gazeTX*gazeLife-gazeX)*gp; gazeY+=(gazeTY*gazeLife-gazeY)*gp;
       // GASPER-ALIVE-001 (D-0108): external attention — the life director points the eyes at a
       // point of interest. Same face-unit space as the pointer look (±4.2/±3.0), own pursuit tau,
       // gated by motionStrength so reduced motion / pause collapses it to zero (never a stare).
       const egGate=externalGazeS*Math.max(0,Math.min(1,motionStrength));
       const egp=1-Math.exp(-dt/0.16); externalGazeX+=((externalGazeTX*4.2*egGate)-externalGazeX)*egp; externalGazeY+=((externalGazeTY*3.0*egGate)-externalGazeY)*egp; // D-0110: gains reverted to the ratified D-0108 values (the A-1 bump belonged to the retracted pupil anatomy)
       // recognition "aha" envelope (settle-with-residual): a smooth 0->1->0 bump after arriving at a POI.
       gazeRecog=(gNow>=gazeRecogStart&&gNow<=gazeRecogEnd&&gazeRecogEnd>gazeRecogStart)?Math.sin(Math.min(1,(gNow-gazeRecogStart)/(gazeRecogEnd-gazeRecogStart))*Math.PI):0;
       // body posture follows the eyes (eyes lead, the pearl leans into the look): eased drift toward the gaze.
       gazeLeanX+=(((gazeX+externalGazeX*0.6)*gazeLeanFactor)-gazeLeanX)*gp;
    } else { const gp=1-Math.exp(-dt/0.20); gazeX+=(0-gazeX)*gp; gazeY+=(0-gazeY)*gp; gazeLeanX+=(0-gazeLeanX)*gp; gazeRecog=0; const egp=1-Math.exp(-dt/0.20); externalGazeX+=(0-externalGazeX)*egp; externalGazeY+=(0-externalGazeY)*egp; }
    eyeOpenL*=eyeRefractoryFrame?.apertureScaleL??1;eyeOpenR*=eyeRefractoryFrame?.apertureScaleR??1; // D-0030: multiplicative recoil preserves full blink closure
    eyeOpenL*=1+physTake/2.618033988749895;eyeOpenR*=1+physTake/2.618033988749895;
    eyeOpenL*=1+gazeRecog*gazeRecogAmp+gazeViewerSettle*gazeRecogAmp*GAZE_VIEWER_SETTLE.dilation;eyeOpenR*=1+gazeRecog*gazeRecogAmp+gazeViewerSettle*gazeRecogAmp*GAZE_VIEWER_SETTLE.dilation; // + D-0038 exit "aha": the recognition aperture dilation ALSO fires on singularity exit (dt-driven, works paused) as the gaze lands on the viewer — bounded (gazeRecogAmp*0.6~=0.11 aperture), eases off with the settle; no anatomy (the almond aperture itself rests more-open, D-0025 idiom); captured by dataset.renderedEyeOpenL/R below // REFRACTORY ORIENT (D-0025): the recognition "aha" — a brief settle-with-residual dilation after arriving at a point of interest (no anatomy; the almond aperture itself rests more-open for a beat)
    const takeEye=1+physTake/1.618033988749895;const _yaw3=viewMetrics.effectiveYaw||0;const _farFeat=1-0.10*Math.abs(Math.sin(_yaw3*Math.PI/180));const _farIsL=_yaw3>=0;const renderedEyeWidthL=faceProjection.leftEye.width*eyeWidthScale*(eyeShape.eyeWidthL||1)*(eyeRefractoryFrame?.widthScaleL??1)*takeEye*(_farIsL?_farFeat:1),renderedEyeWidthR=faceProjection.rightEye.width*eyeWidthScale*(eyeShape.eyeWidthR||1)*(eyeRefractoryFrame?.widthScaleR??1)*takeEye*(_farIsL?1:_farFeat);avatar.dataset.farEyeScale=_farFeat.toFixed(4);avatar.dataset.nearEyeScale='1.0000';avatar.dataset.farArmVis=(viewMetrics.farArmVis??1).toFixed(4);avatar.dataset.footTrack=(viewMetrics.footTrack??1).toFixed(4);avatar.dataset.atlasSeat=physGait.seated?'1':'0';avatar.dataset.renderedEyeOpenL=eyeOpenL.toFixed(5);avatar.dataset.renderedEyeOpenR=eyeOpenR.toFixed(5);avatar.dataset.renderedEyeWidthL=renderedEyeWidthL.toFixed(5);avatar.dataset.renderedEyeWidthR=renderedEyeWidthR.toFixed(5);avatar.dataset.externalEyeAperture=externalEyeAperture===null?'null':Number(externalEyeAperture).toFixed(5);
    // PERSONALITY Q2: ease the cursor-look bias (gated by motionStrength -> freezes
    // under reduced motion / pause) and compose lookX/lookY = authored gaze + cursor bias.
    // The body-lean (gazeLeanX) keeps reading the authored gaze only, so the pearl lags the
    // cursor look by one ease step (eyes lead, body follows; layered timing).
    const pNowQ2=performance.now();
    const pAliveQ2=pointerGazeActive*Math.exp(-(pNowQ2-pointerGazeLastMove)/600);
    const pGateQ2=pAliveQ2*Math.max(0,Math.min(1,motionStrength));
    const pEQ2=1-Math.exp(-dt/0.16);
    pointerGazeX+=(pointerGazeTX*pGateQ2-pointerGazeX)*pEQ2;
    pointerGazeY+=(pointerGazeTY*pGateQ2-pointerGazeY)*pEQ2;
    const gazeLeadX=Math.max(-MOMENTUM_RIG.gazeLeadMax,Math.min(MOMENTUM_RIG.gazeLeadMax,momentumTargetX*MOMENTUM_RIG.gazeLeadGain)),gazeLeadY=Math.max(-MOMENTUM_RIG.gazeLeadMax,Math.min(MOMENTUM_RIG.gazeLeadMax,momentumTargetY*MOMENTUM_RIG.gazeLeadGain)); const lookX=(gazeX+pointerGazeX+externalGazeX)*(1-gazeViewerSettle)+gazeLeadX,lookY=(gazeY+pointerGazeY+externalGazeY)*(1-gazeViewerSettle)+gazeLeadY; avatar.dataset.externalGazeX=externalGazeX.toFixed(3);avatar.dataset.externalGazeY=externalGazeY.toFixed(3);avatar.dataset.externalGazeS=externalGazeS.toFixed(3);avatar.dataset.attentionYaw=attentionYawDeg.toFixed(2);avatar.dataset.exprBodyFe=exprBodyFe.toFixed(4);avatar.dataset.headingYaw=headingYawDeg.toFixed(2);avatar.dataset.facingDeg=effectiveViewYaw().toFixed(2);avatar.dataset.facingSlice=String((()=>{const _d=effectiveViewYaw(),_dd=(((_d%360)+360)%360),_s=Math.round(_dd/30)%12;return((_s+6-1)%12)+1;})());avatar.dataset.yaw=String(viewYawDegrees); // S11 (N36 close): the dial channel is now written EVERY frame — the legacy flush rewrites viewYawDegrees per frame through setYaw, and dataset.yaw (applyFormPresence-only) lagged up to 27°, breaking the witness identity facingDeg = dial+heading+attention (telemetry staleness, not a law break — the S5-disclosed dyaw lag, now closed). Telemetry-only: the value written is the SAME live dial. // GASPER-ALIVE-001 (D-0108) read-only attention telemetry (same idiom as D-0038 look telemetry) // S5 (expression-attention-phd-memo): read-only attention-yaw + body-affect carrier telemetry — the C6/C7 laws are machine-observable on the living loop (N23 DOM-first) // S8 (radial-facing-phd-memo, N39): the 12-slice clock telemetry — headingYaw (travel carrier), facingDeg (composed effective yaw), facingSlice (1..12; 12 = away). Mirror of the law's clock ids, computed from the SAME composed value the deformation reads.
avatar.dataset.gazeLeadX=gazeLeadX.toFixed(3);avatar.dataset.gazeLeadY=gazeLeadY.toFixed(3);avatar.dataset.gazeViewerSettle=gazeViewerSettle.toFixed(4);avatar.dataset.lookX=lookX.toFixed(3);avatar.dataset.lookY=lookY.toFixed(3); // D-0110 fix: the three telemetry writes below were DEAD CODE — they sat after the D-0047 // comment on this one-line statement, so the composed look was never measurable (found by the ALIVE-002 witness; rendering was never affected — lookX/lookY are locals consumed above). D-0047 gaze-leads-motion: eyes glance toward momentumTarget (which LEADS the body => anticipation); comet rest target>0 => eyes sit looking into the round dome ("shift toward the round part"); reversal flips the glance => eyes lead the whip; bounded by gazeLeadMax so the glance stays within the face (a look, not a reconfiguration); 0 at presence rest (target~0). // D-0038 verification telemetry (read-only): expose the settle scalar + composed look so the one-shot exit accent is machine-verifiable on the living loop (the aperture consumption is blink-dominated + the eye-bbox is transform-confounded, per diag_d0038_ground.mjs / the D-0037 lesson) // D-0038 exit settle-on-viewer: pull the composed look to dead center (on the viewer) as the being leaves the seed; gazeViewerSettle eases 1->0 => releases smoothly back into the living aperiodic gaze + cursor look (no permanent stare, 7.1). Face near-invisible at the cross (faceVisibility smoothstep .52-.88, :1290) so the centering is masked until the eyes materialize already on you. Magnitude <= |gazeX+pointerGazeX| (only pulls toward 0). Mouth (:1411) + body-lean (:1416) follow downstream (eyes lead, 7.3).
    const _oL=Math.max(0,Math.min(1,eyeOpenL)),_oR=Math.max(0,Math.min(1,eyeOpenR));
    setTriplet(eyeL,eyeLBloom,eyeLShadow,eyePath(faceProjection.leftEye.x+lookX,faceProjection.leftEye.y+lookY,renderedEyeWidthL,eyeOpenL,eyeShape.eyeTiltL),.9,eyeLOffset,1,{halo:eyeLHalo,bloomOuter:eyeLBloomOuter,shadowOuter:eyeLShadowOuter,bloomScale:1+0.38*_oL});
    setTriplet(eyeR,eyeRBloom,eyeRShadow,eyePath(faceProjection.rightEye.x+lookX,faceProjection.rightEye.y+lookY,renderedEyeWidthR,eyeOpenR,eyeShape.eyeTiltR),.9,eyeROffset,1,{halo:eyeRHalo,bloomOuter:eyeRBloomOuter,shadowOuter:eyeRShadowOuter,bloomScale:1+0.38*_oR});
    setRecess(eyeLRecess,activeFaceAnchors.eyeL,renderedEyeWidthL*(0.12+0.40*_oL),Math.max(1.3,(1.8+eyeOpenL*14.4)*(0.26+0.32*_oL)));setRecess(eyeRRecess,activeFaceAnchors.eyeR,renderedEyeWidthR*(0.12+0.40*_oR),Math.max(1.3,(1.8+eyeOpenR*14.4)*(0.26+0.32*_oR)));
    // Specular spark update: glints track the look with slight parallax (curved wet
    // surface), collapse to zero on a blink (eyeOpen->0), fade with the face on dormant/
    // singularity (faceVisibility), and carry a slow motion-gated shimmer (incommensurate
    // with the idle cycle; static under reduced motion). No anatomical sub-element drawn.
    {const shQ2=motionStrength>0.01?(0.92+0.08*Math.sin(elapsed*0.86+1.3)):1;
     const apL=1.8+eyeOpenL*14.4,apR=1.8+eyeOpenR*14.4;
     const visQ2=Math.max(0,Math.min(1,faceVisibility));
     const oL=Math.max(0,Math.min(1,eyeOpenL*1.4))*visQ2*shQ2;
     const oR=Math.max(0,Math.min(1,eyeOpenR*1.4))*visQ2*shQ2;
     const lx0=faceProjection.leftEye.x+lookX+eyeLOffset.x,ly0=faceProjection.leftEye.y+lookY+eyeLOffset.y;
     const rx0=faceProjection.rightEye.x+lookX+eyeROffset.x,ry0=faceProjection.rightEye.y+lookY+eyeROffset.y;
     eyeSparkL.setAttribute('cx',(lx0-renderedEyeWidthL*0.22+lookX*0.22).toFixed(2));eyeSparkL.setAttribute('cy',(ly0-apL*0.42+lookY*0.22).toFixed(2));eyeSparkL.setAttribute('r',(0.7+1.5*Math.max(0,Math.min(1,eyeOpenL))).toFixed(2));eyeSparkL.setAttribute('opacity',(0.85*oL).toFixed(3));
     eyeSparkL2.setAttribute('cx',(lx0+renderedEyeWidthL*0.16-lookX*0.12).toFixed(2));eyeSparkL2.setAttribute('cy',(ly0+apL*0.30-lookY*0.12).toFixed(2));eyeSparkL2.setAttribute('r',(0.4+0.8*Math.max(0,Math.min(1,eyeOpenL))).toFixed(2));eyeSparkL2.setAttribute('opacity',(0.4*oL).toFixed(3));
     eyeSparkR.setAttribute('cx',(rx0-renderedEyeWidthR*0.22+lookX*0.22).toFixed(2));eyeSparkR.setAttribute('cy',(ry0-apR*0.42+lookY*0.22).toFixed(2));eyeSparkR.setAttribute('r',(0.7+1.5*Math.max(0,Math.min(1,eyeOpenR))).toFixed(2));eyeSparkR.setAttribute('opacity',(0.85*oR).toFixed(3));
     eyeSparkR2.setAttribute('cx',(rx0+renderedEyeWidthR*0.16-lookX*0.12).toFixed(2));eyeSparkR2.setAttribute('cy',(ry0+apR*0.30-lookY*0.12).toFixed(2));eyeSparkR2.setAttribute('r',(0.4+0.8*Math.max(0,Math.min(1,eyeOpenR))).toFixed(2));eyeSparkR2.setAttribute('opacity',(0.4*oR).toFixed(3));
    }
    // D-0110: pupil render RETRACTED by owner order (character-design law, see D-0110).
    // N3 MOUTH CHOKE-POINT: under live-loop authority the mouth reads a low-passed copy of
    // the raced channels so the per-frame applySemanticPose<->geometric-blend race cannot
    // shimmer the lips; mouthPath then maps the calm channels to an emotion-aligned
    // crescent/oval. Off authority (reduced motion / scrub) the shipped frameState path.
    let mouthState;
    if(externalBlinkAuthority){
      if(!mouthShapeSmoothSeeded){mouthShapeSmooth.w=frameState.mouthWidth||.5;mouthShapeSmooth.c=frameState.mouthCurve||0;mouthShapeSmooth.o=frameState.mouthOpen||0;mouthShapeSmooth.lf=frameState.mouthLift||0;mouthShapeSmooth.sk=frameState.mouthSkew||0;mouthShapeSmooth.pn=frameState.mouthPinch||0;mouthShapeSmooth.rd=frameState.mouthRound||0;mouthShapeSmooth.pL=frameState.pullL||0;mouthShapeSmooth.pR=frameState.pullR||0;mouthShapeSmoothSeeded=true;}
      const ma=1-Math.exp(-dt/0.18);
      mouthShapeSmooth.w+=((frameState.mouthWidth||.5)-mouthShapeSmooth.w)*ma;mouthShapeSmooth.c+=((frameState.mouthCurve||0)-mouthShapeSmooth.c)*ma;mouthShapeSmooth.o+=((frameState.mouthOpen||0)-mouthShapeSmooth.o)*ma;mouthShapeSmooth.lf+=((frameState.mouthLift||0)-mouthShapeSmooth.lf)*ma;mouthShapeSmooth.sk+=((frameState.mouthSkew||0)-mouthShapeSmooth.sk)*ma;mouthShapeSmooth.pn+=((frameState.mouthPinch||0)-mouthShapeSmooth.pn)*ma;mouthShapeSmooth.rd+=((frameState.mouthRound||0)-mouthShapeSmooth.rd)*ma;mouthShapeSmooth.pL+=((frameState.pullL||0)-mouthShapeSmooth.pL)*ma;mouthShapeSmooth.pR+=((frameState.pullR||0)-mouthShapeSmooth.pR)*ma;
      mouthState={...frameState,mouthWidth:mouthShapeSmooth.w,mouthCurve:mouthShapeSmooth.c,mouthOpen:mouthShapeSmooth.o*mouthOpenScale,mouthLift:mouthShapeSmooth.lf,mouthSkew:mouthShapeSmooth.sk,mouthPinch:mouthShapeSmooth.pn,mouthRound:mouthShapeSmooth.rd,pullL:mouthShapeSmooth.pL,pullR:mouthShapeSmooth.pR};
    }else{mouthShapeSmoothSeeded=false;mouthState=mouthOpenScale===1?frameState:{...frameState,mouthOpen:frameState.mouthOpen*mouthOpenScale};}
    {const _mOpen=Math.max(0,mouthState.mouthOpen||0),_mK=Math.max(0,Math.min(1,_mOpen)),_mW=14.5+(mouthState.mouthWidth||.5)*25;
    setTriplet(mouth,mouthBloom,mouthShadow,mouthPath(mouthState),.75,{x:mouthOffset.x+faceProjection.mouth.x-121+lookX*0.35,y:mouthOffset.y+faceProjection.mouth.y-140+mouthYShift+lookY*0.35},1.18*faceProjection.transform.compression*mouthScale,{halo:mouthHalo,bloomOuter:mouthBloomOuter,shadowOuter:mouthShadowOuter,bloomScale:1+0.38*_mK}); // V2.7 (D-0024): mouth/face follows gaze at 0.35 (eyes lead, §7.3)
    setRecess(mouthRecess,activeFaceAnchors.mouth,Math.max(3.2,_mW*(0.14+0.24*_mK)),Math.max(1.3,(1.7+_mOpen*12)*(0.26+0.30*_mK)));}
    renderExpressionShell(faceProjection,activeFaceAnchors,frameState,faceVisibility);
    const _mlGate=MOTION_LIGHT.enabled?(((globalThis.__GASPER_LIVE_COEFFS__||{}).motionLight||{}).motionLightGain??1):0;const _mlSpeed=Math.max(Math.hypot(momentumVX,momentumVY),motionStrength>0.001?physLight:0);const _mlFactor=1+MOTION_LIGHT.amp*Math.min(1,_mlSpeed/MOTION_LIGHT.refSpeed)*_mlGate; // D-0063 momentum-coupled interior-light factor (computed once, folded into e on the next line + reported on the telemetry line after); _mlSpeed = last-frame momentum speed (module lets :273); _mlGate = applied live-coeff gate (telemetry-honest)
    const legacyInteriorLight=Number(interiorEnergy.value)*laggedEnergy*Math.max(.85,Math.min(1.15,familyLight))*(1+recognitionSpark*RECOGNITION_SPARK.lift)*(DEPTH_GLOW.enabled?(1+DEPTH_GLOW.amp*depthGlow):1)*(FORM_EXPANSION.enabled?(1+FORM_EXPANSION.lightAmp*formExpansion):1)*(FORM_TENSION.enabled?(1-FORM_TENSION.lightAmp*formTension):1)*(eightStateBodyEnabled?(1+EIGHT_STATE_BODY.lightAmp*stateLight):1)*_mlFactor;
    const e=unifiedLight?Math.max(.05,Math.min(1.35,Number(interiorEnergy.value)*unifiedLight.interior)):legacyInteriorLight; // GASPER-UNIFIED-LIGHT-001: canonical material response owns interior-light intensity whenever the unified field is active; legacy family/state recipe remains a compatibility fallback.
    avatar.dataset.v3DepthGlow=depthGlow.toFixed(4);avatar.dataset.v3FormExpansion=formExpansion.toFixed(4);avatar.dataset.v3FormTension=formTension.toFixed(4);avatar.dataset.v3RecognitionPop=recognitionPop.toFixed(4);avatar.dataset.motionLightGain=_mlGate.toFixed(4);avatar.dataset.motionLightSpeed=_mlSpeed.toFixed(4);avatar.dataset.motionLightFactor=_mlFactor.toFixed(4); // D-0040 V3 + D-0041 V3 Layer A + D-0063 motion-light read-only telemetry (clean CDP observables; no behavior). D-0063 reports the APPLIED factor (the exact multiplier folded into e) + the speed + the gate so the witness reconstructs expected = 1+amp*min(1,speed/refSpeed)*gate and compares to the observed factor (proves wiring + formula + gate)
    avatar.dataset.eightStateRecipe=eightStateId;avatar.dataset.stateCrown=stateCrown.toFixed(4);avatar.dataset.stateExpansion=stateExpansion.toFixed(4);avatar.dataset.stateTension=stateTension.toFixed(4);avatar.dataset.stateLight=stateLight.toFixed(4);avatar.dataset.stateLow=stateLow.toFixed(4);avatar.dataset.stateWide=stateWide.toFixed(4);avatar.dataset.stateBeat=stateBeat.toFixed(4);avatar.dataset.eightStateBodyEnabled=eightStateBodyEnabled?'1':'0';const _mAg=EIGHT_STATE_MOUTH.enabled?(((globalThis.__GASPER_LIVE_COEFFS__||{}).mouth||{}).mouthGain??1):0;avatar.dataset.stateMouthCurve=(stateMouthCurve*_mAg).toFixed(4);avatar.dataset.stateMouthOpen=(stateMouthOpen*_mAg).toFixed(4);avatar.dataset.stateMouthSkew=(stateMouthSkew*_mAg).toFixed(4);avatar.dataset.stateMouthPullR=(stateMouthPullR*_mAg).toFixed(4);avatar.dataset.stateMouthPullL=(stateMouthPullL*_mAg).toFixed(4);avatar.dataset.mouthGain=_mAg.toFixed(4);avatar.dataset.statePop=statePop.toFixed(4);avatar.dataset.popGain=((eightStateBodyEnabled&&EIGHT_STATE_POP.enabled)?(((globalThis.__GASPER_LIVE_COEFFS__||{}).pop||{}).popGain??1):0).toFixed(4); // D-0059 read-only telemetry: stateMouth* report the APPLIED delta (eased * gain) so the channel is truthful — at gain 0 the V4 contribution to the render is exactly 0 and the dataset reads 0 (the held mouth is then the pre-existing substrate only); at gain 1 it equals the eased delta. mouthGain = the raw gate. (D-0049 stateCrown..stateBeat telemetry unchanged on the prior line.)
    const _fvGtel=EIGHT_STATE_FORM_VARIANT.enabled?(((globalThis.__GASPER_LIVE_COEFFS__||{}).formVariant||{}).formVariantGain??1):0;const _fvApp=(silhouetteProfile==='presence'&&_fvGtel!==0)?1:0;avatar.dataset.fvCrown=(fvCrown*_fvApp).toFixed(4);avatar.dataset.fvLow=(fvLow*_fvApp).toFixed(4);avatar.dataset.fvWide=(fvWide*_fvApp).toFixed(4);avatar.dataset.fvAsym=(fvAsym*_fvApp).toFixed(4);avatar.dataset.fvMaxAbs=fvMaxAbs.toFixed(4);avatar.dataset.formVariantGain=_fvGtel.toFixed(4); // D-0066 SLICE A read-only telemetry (clean CDP observables; no behavior). fvCrown/fvLow/fvWide report the APPLIED eased variant features (x _fvApp so they read exactly 0 when the composition is skipped at gain 0 or off-presence — honest applied value, not the raw eased state); fvMaxAbs = the MEASURED max |per-vertex variant radius delta| this frame (the no-pinch check; 0 when skipped; must be <= EIGHT_STATE_FORM_VARIANT.pinch=2.0 at gain 1); formVariantGain = the raw gate. The witness reconstructs the expected per-state features from the shipped const and compares to these + asserts the pinch bound + the gain-0 identity.
    cyanFieldNode.setAttribute('opacity',Math.max(.10,Math.min(.80,.62*e)).toFixed(3)); // N204: MOTION_LIGHT may brighten the SAME hull (cyan foot + crown volume). It must not drive faceRecess/bloom — those hug the locked almonds, they are not a card that zip energy reveals. D-0055: de-saturate the per-state interior-light read so the D-0049/D-0053 stateLight delta reads in a still. Prior bases (.55/.62/.92) pinned violet (.55->.52 ceil) and face (.92->.72 ceil) at their clamp ceiling already at neutral e~=1, so the per-state light landed on the flat top of the clamp = zero static read. Re-based to the CURRENT neutral opacities (.52/.62/.72) and WIDENED the clamp windows (ceilings .52/.68/.72 -> .66/.80/.90; floors .10/.14/.18 -> .06/.10/.16) so the +/-~18% e swing (lightAmp 0.10->0.18, :48) stays in the LINEAR region: recognition/pleased visibly luminous, blocked/thinking/dormant visibly dimmer, NEUTRAL LOOK PRESERVED (identical .52/.62/.72 neutral opacities at e=1). INTENSITY-ONLY (opacity of existing field nodes; no hue D-0033; no new element; no silhouette touch => zero pinch). Max per-state |delta from neutral| ~0.13, recognition-blocked spread ~0.25, both < maxPaletteDelta 0.32. At low interior energy (e<~0.78) the face field tracks energy faithfully instead of sitting clipped/flat (calmer=dimmer; witnessed). Reversible (restore bases/ceilings/floors + lightAmp 0.10 => prior).
    const _cvG=unifiedLight?unifiedLight.crown:((globalThis.__GASPER_LIVE_COEFFS__||{}).crownLight||{}).crownLightGain??1; // D-0068 / GASPER-UNIFIED-LIGHT-001: canonical crown response owns volumetric fill in unified mode; legacy gain remains fallback.
    if(_cvG>0){const _cvE=Math.max(0,Math.min(1,e));apexGlowNode.setAttribute('opacity',Math.max(.16,Math.min(.42,(.18+.26*_cvE)*_cvG)).toFixed(3));crownVolumePath.setAttribute('opacity',Math.max(.22,Math.min(.60,(.28+.28*_cvE)*_cvG)).toFixed(3));}else{apexGlowNode.setAttribute('opacity','0');crownVolumePath.setAttribute('opacity','0');}
    avatar.dataset.crownLightGain=_cvG.toFixed(4); // read-only telemetry (same idiom as :1586)
    if(!spatialBaseCaptured){spatialBase={leftLobeGlint:parseFloat(leftLobeGlint.getAttribute('opacity'))||1,rightLobeGlint:parseFloat(rightLobeGlint.getAttribute('opacity'))||1,leftLobeAura:parseFloat(leftLobeAura.getAttribute('opacity'))||1,rightLobeAura:parseFloat(rightLobeAura.getAttribute('opacity'))||1,leftLobeVolume:parseFloat(leftLobeVolume.getAttribute('opacity'))||1,rightLobeVolume:parseFloat(rightLobeVolume.getAttribute('opacity'))||1,leftLobeShade:parseFloat(leftLobeShade.getAttribute('opacity'))||1,rightLobeShade:parseFloat(rightLobeShade.getAttribute('opacity'))||1};spatialBaseCaptured=true;} const _sdlCfg=(globalThis.__GASPER_LIVE_COEFFS__||{}).depthLight||{};const _sdlG=SPATIAL_DEPTH_LIGHT.enabled?(_sdlCfg.spatialGain??1):0;const _sdlM=getViewMetrics(FORM_PROFILES[silhouetteProfile]);const _sdlLeftIsNear=_sdlM.amount<0;const _sdlL=(_sdlLeftIsNear?_sdlM.nearLobeScale:_sdlM.farLobeScale)-1;const _sdlR=(_sdlLeftIsNear?_sdlM.farLobeScale:_sdlM.nearLobeScale)-1;const _sdlIn=Math.max(0,Math.min(1,e));const _sdlDefs=[['leftLobeGlint',leftLobeGlint,_sdlL,1],['rightLobeGlint',rightLobeGlint,_sdlR,1],['leftLobeAura',leftLobeAura,_sdlL,1],['rightLobeAura',rightLobeAura,_sdlR,1],['leftLobeVolume',leftLobeVolume,_sdlL,1],['rightLobeVolume',rightLobeVolume,_sdlR,1],['leftLobeShade',leftLobeShade,_sdlL,SPATIAL_DEPTH_LIGHT.shadeSign],['rightLobeShade',rightLobeShade,_sdlR,SPATIAL_DEPTH_LIGHT.shadeSign]];for(const _d of _sdlDefs){const _b=spatialBase[_d[0]];const _t=_sdlG*_sdlIn*_d[2]*SPATIAL_DEPTH_LIGHT.K*_d[3];const _o=Math.max(_b*SPATIAL_DEPTH_LIGHT.floorFrac,Math.min(Math.min(_b*SPATIAL_DEPTH_LIGHT.ceilFrac,1),_b*(1+_t)));if(avatar.dataset.materialSpace==='persistent'&&(_d[0]==='leftLobeGlint'||_d[0]==='rightLobeGlint')){depthLightGlintGain[_d[0]==='leftLobeGlint'?'left':'right']=_b>0?_o/_b:1;continue;} // GASPER-MAT-004 owns the final glint write on the persistent path; the fold only contributes its normalized view-depth gain.
_d[1].setAttribute('opacity',_o.toFixed(3));} avatar.dataset.spatialGain=_sdlG.toFixed(4);avatar.dataset.sdlRightSign=_sdlR.toFixed(4);avatar.dataset.sdlLeftSign=_sdlL.toFixed(4);avatar.dataset.sdlInterior=_sdlIn.toFixed(4); // D-0060 spatial per-lobe depth-light fold (see SPATIAL_DEPTH_LIGHT const for the full rationale); telemetry exposes the gate + the two lobe signs + the interior factor so the witness reconstructs the expected per-node modulation = gain*interior*sign*K*nodeSignMult and compares to the observed opacity (proves wiring + sign-correctness + interior-gate)
    // D-0046 PILLAR 3 momentum/inertia rig: integrate the CoM spring-damper toward the contour centroid shift,
    // then expose momOffsetX/Y/Lean for the idleRig transform below. pts is the blended/morphed/smoothed contour
    // in body-local space (:1304-1326); its first moment moves when the form morphs asymmetric (comet front-heavy
    // => centroid forward => shoot forward). motionStrength=0 (reduced motion) => no integration + offset eases
    // home (frozen, 7.1). Gated on MOMENTUM_RIG.enabled. dt/now/motionStrength are in scope here (:1276/:1465).
    let momOffsetX=0, momOffsetY=0, momLean=0;
    if(MOMENTUM_RIG.enabled && pts.length){
      let cx=0, cy=0; for(const p of pts){cx+=p.x; cy+=p.y;} cx/=pts.length; cy/=pts.length;
      if(momentumSeedCX===null){momentumSeedCX=cx; momentumSeedCY=cy; momentumLastT=now;}
      const rawTX=(cx-momentumSeedCX)*MOMENTUM_RIG.centroidGain*stateMomGain, rawTY=(cy-momentumSeedCY)*MOMENTUM_RIG.centroidGain*stateMomGain; // D-0062 centroid drive scaled by per-state gain
      const tA=1-Math.exp(-dt/Math.max(0.02,MOMENTUM_RIG.targetTau*stateMomTau)); // D-0062 target-follow lag scaled by per-state tau
      momentumTargetX+=(rawTX-momentumTargetX)*tA; momentumTargetY+=(rawTY-momentumTargetY)*tA;
      const mdt=Math.max(0.001,Math.min(0.05,(now-momentumLastT)/1000)); momentumLastT=now;
      if(motionStrength>0.001){
        const dragX=MOMENTUM_RIG.cLow*stateMomDamp+MOMENTUM_RIG.cHigh*stateMomDamp*Math.abs(momentumVX), dragY=MOMENTUM_RIG.cLow*stateMomDamp+MOMENTUM_RIG.cHigh*stateMomDamp*Math.abs(momentumVY); // D-0062 damping scaled by per-state damp
        momentumVX+=(-MOMENTUM_RIG.kX*stateMomStiff*(momentumX-momentumTargetX)-dragX*momentumVX)*mdt*motionStrength; // D-0062 stiffness scaled by per-state stiff
        momentumVY+=(-MOMENTUM_RIG.kY*stateMomStiff*(momentumY-momentumTargetY)-dragY*momentumVY)*mdt*motionStrength; // D-0062 stiffness scaled by per-state stiff
        momentumX+=momentumVX*mdt; momentumY+=momentumVY*mdt;
        const mo=MOMENTUM_RIG.maxOffset;
        if(momentumX>mo){momentumX=mo; momentumVX=Math.min(0,momentumVX);} else if(momentumX<-mo){momentumX=-mo; momentumVX=Math.max(0,momentumVX);}
        if(momentumY>mo){momentumY=mo; momentumVY=Math.min(0,momentumVY);} else if(momentumY<-mo){momentumY=-mo; momentumVY=Math.max(0,momentumVY);}
      } else {
        const home=1-Math.exp(-mdt/0.4); // reduced motion / paused authority: ease home, no perpetual drift (7.1)
        momentumX+=(0-momentumX)*home; momentumY+=(0-momentumY)*home; momentumVX=0; momentumVY=0;
        momentumTargetX+=(0-momentumTargetX)*home; momentumTargetY+=(0-momentumTargetY)*home;
      }
      momOffsetX=momentumX*motionStrength; momOffsetY=momentumY*motionStrength;
      const leanRaw=momentumVX*MOMENTUM_RIG.leanGain*stateMomLean*motionStrength; // D-0062 body-tip-into-velocity scaled by per-state lean
      momLean=Math.max(-MOMENTUM_RIG.maxLean,Math.min(MOMENTUM_RIG.maxLean,leanRaw));
    }
    avatar.dataset.momentumX=momentumX.toFixed(3);avatar.dataset.momentumY=momentumY.toFixed(3);avatar.dataset.momentumSpeed=Math.hypot(momentumVX,momentumVY).toFixed(3);avatar.dataset.momentumTargetX=momentumTargetX.toFixed(3);avatar.dataset.stateMomStiff=stateMomStiff.toFixed(4);avatar.dataset.stateMomDamp=stateMomDamp.toFixed(4);avatar.dataset.stateMomGain=stateMomGain.toFixed(4);avatar.dataset.stateMomLean=stateMomLean.toFixed(4);avatar.dataset.stateMomTau=stateMomTau.toFixed(4);avatar.dataset.momStateGain=((eightStateBodyEnabled&&EIGHT_STATE_MOMENTUM.enabled)?(((globalThis.__GASPER_LIVE_COEFFS__||{}).momentum||{}).stateGain??1):0).toFixed(4); // D-0046 read-only telemetry + D-0062 per-state momentum multipliers + the APPLIED gate (telemetry-honesty: reports eased-multiplier context x applied gate, not a gate-independent value)
    // GASPER-CRAFT-002 · S2 · D-0099 Doctrine 3a — KEYS ARE TRUTH. Any provenance in flight draws
    // EXACTLY what the authority authored this tick (no renderer lag — phi-beta-motion-perception:
    // never rely on auto-interpolation to communicate an action). The ONLY easing left is the
    // home-return policy transition: provenance none => releaseTau (motion on) or the 0.4s
    // reduced-motion fold (motionStrength 0, constitution 7.1) — the target is kept so living motion
    // resumes the authority's pose without a jump.
    let wDx=0,wAlt=0,wDepthScale=1,wHorizon=0,wTilt=0;
    const gaitGate=motionStrength>0.001?1:0; // CYCLE 1 L9 (gait-expression-phd-memo) — reduced motion collapses the gait expression exactly like momentum; zero gate => byte-identical raster. Declared OUTSIDE the world-pose block below: the idleRig squash (Cycle 4 R3) and the telemetry both live past that block's closing brace
    const booGate=reducedMotion?0:1; // S10 (owner N42) — the Boo bob gates ONLY on reduced motion: the ghost NEVER stands (rest keeps breathing — that IS the read); the bob carrier is 0 outside boo mode anyway
    {if(worldPoseTarget.provenance==='none'){const tau=motionStrength>0.001?WORLD_SPACE.releaseTau:0.4;const home=1-Math.exp(-dt/Math.max(0.02,tau));worldPoseCurrent.x+=(0-worldPoseCurrent.x)*home;worldPoseCurrent.y+=(0-worldPoseCurrent.y)*home;worldPoseCurrent.z+=(0-worldPoseCurrent.z)*home;worldPoseCurrent.tilt+=(0-worldPoseCurrent.tilt)*home;}
    else{worldPoseCurrent.x=worldPoseTarget.x;worldPoseCurrent.y=worldPoseTarget.y;worldPoseCurrent.z=worldPoseTarget.z;worldPoseCurrent.tilt=worldPoseTarget.tilt;}
    if(Math.abs(worldPoseCurrent.x)<0.004)worldPoseCurrent.x=0;if(Math.abs(worldPoseCurrent.y)<0.004)worldPoseCurrent.y=0;if(Math.abs(worldPoseCurrent.z)<0.5)worldPoseCurrent.z=0;if(Math.abs(worldPoseCurrent.tilt)<0.004)worldPoseCurrent.tilt=0; // home byte-stability: the home-return ease never lands exactly on zero, and a residual would keep rewriting the worldRig transform attribute every frame — snap residuals to exact zero so home means no transform attribute at all (bit-identical to pre-space frames). z snaps at 0.5 world units (scale error 0.026% — imperceptible; the fence unit is a world unit now, not a 0..1 lane)
    const wScale=WORLD_SPACE.homeViewDistance/(WORLD_SPACE.homeViewDistance+worldPoseCurrent.z);wDx=(worldPoseCurrent.x/WORLD_SPACE.unitsPerContentPx)*wScale;const _stanceLive=((globalThis.__GASPER_STANCE__||{}).live>0.004)?1:0;wAlt=(worldPoseCurrent.y+physGait.bobLiftUnits*gaitGate*(1-_stanceLive)+physBooBob*booGate)/WORLD_SPACE.unitsPerContentPx;wDepthScale=wScale;wHorizon=WORLD_SPACE.floorToHorizonPx*(1-wScale);wTilt=_stanceLive?0:worldPoseCurrent.tilt; // S10 (owner N42): the Boo perpetual-bob rides the SAME altitude lift the vault bob rides — the ghost breathes at rest (booGate is reduced-motion-only); 0 outside boo mode => byte-identical // CYCLE 4 R2 (walk-weight-transfer-phd-memo): the vault roll rides the SAME tilt channel as flight tilt, additive + gated — the body axis leans onto the loaded side (one sign flip per step), zero at rest => the flight-tilt raster is untouched. // DEPTH LAW: lateral screen offset carries the projection too ((x/8)·scale — a point off the axis projects by the same factor); wAlt stays UNPROJECTED world altitude in content px — the idleRig applies it inside the depth-scaled frame below, so the rig scale projects it exactly once. CYCLE 1 L5/L7: the vault bob lifts the COM (high at mid-stance) through the SAME altitude channel the shadow attenuates against, and the lateral sway shifts him onto the support leg through the projected lateral channel — the renderer expresses what the kernel derived, never authors a step
    if(wDx!==0||wAlt!==0||wDepthScale!==1||wTilt!==0){worldRig.setAttribute('transform',`translate(${wDx.toFixed(3)} ${(-wHorizon).toFixed(3)}) translate(120 190) scale(${wDepthScale.toFixed(5)}) rotate(${(-wTilt).toFixed(2)} 0 -45) translate(-120 -190)`);}else if(worldRig.getAttribute('transform')){worldRig.removeAttribute('transform');}
    // CYCLE 5 S0/S2 (step-cycle-phd-memo) — the planted base. The kernel DERIVES baseX: a
    // sample-and-hold of the vault sway (holds during stance, exchanges at double support —
    // the contour's step event, D-0118 step vocabulary). The COM already rides swayX through
    // wDx above, so the contour base needs only the RELATIVE offset δ = baseX − swayX,
    // expressed as a bottom-weighted skewX about the face-zone anchor (120,112) — floor arm
    // 78 content px; the depth scale applies to sway and skew alike, so it cancels in θ.
    // Additive + gated (gaitGate): zero gait or reduced motion => no stepRig transform =>
    // byte-identical raster. stepRig wraps ONLY the contour shell — the face/expression
    // layers sit outside it, so the step never touches the face grammar (D-0118 binding).
    const plantX=Math.abs(Number(physGait.plantedScreenXUnits)||0)>0.004?(Number(physGait.plantedScreenXUnits)||0):(Number(physGait.stepBaseXUnits)||0);const loadX=Number(physGait.stepBaseXUnits)||0;const stepDxPx=(loadX*gaitGate)/WORLD_SPACE.unitsPerContentPx;const plantDxPx=(plantX*gaitGate)/WORLD_SPACE.unitsPerContentPx;
    const stepSkewDeg=_stanceLive?0:Math.abs(Number(physGait.plantedScreenXUnits)||0)>0.004?0:Math.abs(stepDxPx)<0.004?0:Math.max(-4,Math.min(4,Math.atan(stepDxPx/78)*180/Math.PI)); // sockets own the step — no shell shear while stance is live. else S2 fence ±4°; sub-0.004px residuals snap to zero
    if(stepSkewDeg!==0){stepRig.setAttribute('transform',`translate(120 112) skewX(${stepSkewDeg.toFixed(3)}) translate(-120 -112)`);}else if(stepRig.getAttribute('transform')){stepRig.removeAttribute('transform');}
    avatar.dataset.worldPoseX=worldPoseCurrent.x.toFixed(2);avatar.dataset.worldPoseY=worldPoseCurrent.y.toFixed(2);avatar.dataset.worldPoseZ=worldPoseCurrent.z.toFixed(4);avatar.dataset.worldPoseTilt=worldPoseCurrent.tilt.toFixed(2);avatar.dataset.worldPoseProvenance=worldPoseTarget.provenance;avatar.dataset.worldDepthScale=wDepthScale.toFixed(5);avatar.dataset.physicsWake='0.000';avatar.dataset.physicsLight=physLight.toFixed(3);avatar.dataset.gaitPhase=physGait.phase.toFixed(3);avatar.dataset.gaitHz=physGait.stepHz.toFixed(2);avatar.dataset.gaitSpeedRatio=physGait.speedRatio.toFixed(3);avatar.dataset.gaitBob=(physGait.bobLiftUnits*gaitGate).toFixed(2);avatar.dataset.gaitSwayX=(physGait.swayXUnits*gaitGate).toFixed(2);avatar.dataset.gaitRoll=(physGait.rollDeg*gaitGate).toFixed(3);avatar.dataset.gaitSquash=(physGait.contactSquash*gaitGate).toFixed(4);avatar.dataset.gaitStepX=(physGait.stepBaseXUnits*gaitGate).toFixed(2);avatar.dataset.gaitPlantX=(plantX*gaitGate).toFixed(2);avatar.dataset.gaitPlantWorld=(worldPoseCurrent.x+plantX).toFixed(2);avatar.dataset.gaitSupportSide=(Number(physGait.supportSide)||0).toFixed(0);avatar.dataset.gaitStepSkew=stepSkewDeg.toFixed(3);avatar.dataset.gaitShadowDx=plantDxPx.toFixed(3);avatar.dataset.gaitBankDeg=(physGait.bankDeg*gaitGate).toFixed(3);avatar.dataset.gaitFlatten=(physGait.stepFlattenUnits*gaitGate).toFixed(2);avatar.dataset.gaitFlattenW=(physGait.stepFlattenWidthUnits*gaitGate).toFixed(2);avatar.dataset.plantedCompress=(physGait.plantedCompress*gaitGate).toFixed(3);avatar.dataset.incomingCompress=(physGait.incomingCompress*gaitGate).toFixed(3);avatar.dataset.hopMix=(physGait.hopMix||0).toFixed(3);avatar.dataset.gaitFlight=(physGait.flight*gaitGate).toFixed(3);avatar.dataset.swingLift=(physGait.swingLiftUnits*gaitGate).toFixed(2);avatar.dataset.swingAdvance=(physGait.swingAdvanceUnits*gaitGate).toFixed(2);avatar.dataset.loadedDrop=(physGait.loadedDropUnits*gaitGate).toFixed(2);avatar.dataset.swingClearance=(physGait.swingClearance*gaitGate).toFixed(3);avatar.dataset.windPressure=(physWind.pressure*gaitGate).toFixed(3);avatar.dataset.windDirX=(physWind.dirX*gaitGate).toFixed(3);avatar.dataset.booBob=(physBooBob*booGate).toFixed(3);} // S10 (owner N42) — the Boo perpetual-bob telemetry (N23 DOM-first): the ghost never stands; gated on reduced motion only; 0 outside boo mode. // S4 F-LAW 2 (flight-physics-phd-memo, owner N31) — wind-resistance telemetry (N23 DOM-preferred): the kernel's lagged dynamic pressure + screen-x travel direction, gated like the roll so reduced motion collapses them; the expression rides the contour base radius (formRadiusAtFor), these channels are observer-only // CYCLE 11 Z1/Z4 (step-shape-phd-memo) — contact-flatten telemetry: signed screen-x depth + patch half-width (world units), gated like the roll so reduced motion collapses it; the expression rides the contour base radius (formRadiusAtFor), these channels are observer-only // CYCLE 10 Y1 (bank-phd-memo) — centripetal bank telemetry (signed toward the turn center in screen x), gated like the roll so reduced motion collapses it; the expression rides worldPoseTilt, this channel is observer-only // CYCLE 9 C1: the contact-shadow translate (the floor's answer to the exchange), observer-only // CYCLE 1 + CYCLE 4 + CYCLE 5 — gait witness telemetry (N23 DOM-preferred): phase/hz/speedRatio/bob/sway/roll/squash/step readable observer-only from the avatar dataset // worldRig = projected travel + depth scale + horizon lift + tilt about the floor anchor (scale about (120,190) keeps feet on the ground; rotate about (120,145) = body heart); altitude lift applies on the idleRig below so the shadow never leaves the floor; worldDepthScale dataset = witness telemetry for the depth-read capture gate
    const stateMotion=Math.max(motionStrength*(frameState.motionGain??.72),_lifeFloor),idleX=idle.driftX*stateMotion*breathGainE+frameState.postureX*.15,idleY=idle.liftY*stateMotion*breathGainE+frameState.postureY*.10;const gaitSquash=physGait.contactSquash*gaitGate;const idleScaleX=(1+(idle.scaleX-1)*stateMotion*breathGainE),idleScaleY=(1+(idle.scaleY-1)*stateMotion*breathGainE);const _gaitLive=(physGait.seated?Math.max(0,Math.min(1,Number(physGait.leftoverSway)||0)):((Number(physGait.supportSide)||0)!==0?1:0))*gaitGate;const _payXPx=0;const idleLeanDeg=0;
    idleRig.setAttribute('transform',`translate(${(idleX+gazeLeanX+momOffsetX+_payXPx).toFixed(3)} ${(idleY+gazeLeanX*0.10+momOffsetY-wAlt).toFixed(3)}) translate(120 110) rotate(${(gazeLeanX*0.55+momLean+idleLeanDeg).toFixed(2)}) scale(${idleScaleX.toFixed(5)} ${idleScaleY.toFixed(5)}) translate(-120 -110)`);
    avatar.dataset.gaitPayX=_payXPx.toFixed(3);avatar.dataset.gaitLive=_gaitLive.toFixed(3);
    const _cyanPlant=(Number(physGait.plantedScreenXUnits)||0)/WORLD_SPACE.unitsPerContentPx;cyanFieldNode.setAttribute('transform',`translate(${(idle.reservoirX*starMotion+3.4*viewMetrics.amount+_cyanPlant).toFixed(2)} ${(idle.reservoirY*starMotion+.8*viewMetrics.amount).toFixed(2)})`);
    keyReflectionLayer.setAttribute('transform',`translate(${(idle.reflectionX*starMotion*0.5).toFixed(2)} ${(idle.reflectionY*starMotion*0.5).toFixed(2)})`);secondaryReflectionLayer.setAttribute('transform',`translate(${(-idle.reflectionX*.36*starMotion*0.5).toFixed(2)} ${(idle.reflectionY*.42*starMotion*0.5).toFixed(2)})`);lobeGlintsLayer.setAttribute('transform',`translate(${(idle.lobeLag*starMotion*0.5).toFixed(2)} 0)`); // D-0077: dynamic highlight travel halved (Qwen's moving-light layer no longer sweeps a bright band across the crown during transitions)
    const minX=Math.min(...pts.map(point=>point.x)),maxX=Math.max(...pts.map(point=>point.x)),maxY=Math.max(...pts.map(point=>point.y)),width=maxX-minX;
    lastHoldPaint={physIdle,postureScaleY:current.postureScaleY||1,volumeY:(current.postureScaleY||1),cycleSeconds,bodyHeld,lifeFloor:_lifeFloor,motion:Number(motion.value),elapsed,unifiedTime:avatar.dataset.unifiedRenderTime||null,unifiedAuthority:avatar.dataset.unifiedRenderAuthority||null,hullHeight:maxY-Math.min(...pts.map(point=>point.y)),stars:{violet:null,cyan:cyanFieldNode.getAttribute("transform"),key:keyReflectionLayer.getAttribute("transform"),reflectionX:idle.reflectionX,reflectionY:idle.reflectionY,reservoirX:idle.reservoirX,reservoirY:idle.reservoirY},starMotion};
    const wGap=wAlt*wDepthScale,wShrink=1/(1+wGap*0.02),wDepthFade=wDepthScale<0.9995?Math.max(0,wDepthScale):1,wFade=1/(1+Math.max(0,wGap)*SHADOW_WGAP_GAIN)*wDepthFade;const _contactLoad=Math.max(0,Math.min(1,(physGait.contactSquash||0)/0.05));const _flattenLoad=Math.max(0,Math.min(1,Math.abs(physGait.stepFlattenUnits||0)/61.2));const _supportLoad=Math.max(_contactLoad,_flattenLoad)*gaitGate;avatar.dataset.contactSupport=_supportLoad.toFixed(3); // GASPER-SPACE-001 PHASE A + GASPER-CRAFT-002 S2: altitude coupling — the shadow never leaves the floor (its cy derives from the pre-transform body bbox, so idleRig lift doesn't move it); instead it shrinks + fades as the body rises, the classic lift read. The law reads the SCREEN gap (wAlt·depthScale — the eye sees the projected separation; the shadow itself rides the depth-scaled worldRig). At wGap=0 both factors are exactly 1 => the authored values below are bit-identical to prior. + GASPER-CRAFT-002 S4: DEPTH FADE — a far Gasper casts a fainter shadow (atmosphere): ×min(1,scale), folded into wFade so every shadow opacity carries it; quantized to exactly 1 at the home plane (scale ≥ .9995) so home stays byte-identical. + CYCLE 13 L1/L2 (contact-shadow-load-phd-memo): the fade reads ONLY true lift — max(0,wGap): a sunk COM is ground contact (gap 0, the base is planted), the shadow already at its authored contact darkness; darkening past contact diverged the rational form past 1.0 into renderer clipping (cycle-13 wall: 81/4770 take-20 samples >1.0, max 1.552, the whole floor stack strobing full-black at each exchange). The load side answers through wShrink (the patch widens under mass — Hertz form carried from Z1) and C1 convergence, not opacity. Gain re-derived at the Cycle-8 bob so the lift-fade swing lands exactly on M3's 10 % fence; exact 1 at wGap=0 (home byte-stable, D-0088 idiom).
    const regularGroundRx=58,regularGroundRy=16,regularGroundCy=192;
    ground.setAttribute('rx',regularGroundRx.toFixed(2));
    ground.setAttribute('ry',regularGroundRy.toFixed(2));
    ground.setAttribute('cy',regularGroundCy.toFixed(2));
    ground.setAttribute('opacity','0.55');
    contactShadow.setAttribute('rx','34');
    contactShadow.setAttribute('ry','7');
    contactShadow.setAttribute('cy','188');
    contactShadow.setAttribute('opacity','0.72');
    if(contactShadow.getAttribute('transform')||ground.getAttribute('transform')){
      contactShadow.removeAttribute('transform');
      contactShadowCore.removeAttribute('transform');
      contactShadowOuter.removeAttribute('transform');
      ground.removeAttribute('transform');
      groundOuter.removeAttribute('transform');
    }
    if(worldShadowAttenuated){
      groundOuter.setAttribute('rx','112');groundOuter.setAttribute('ry','24');groundOuter.setAttribute('opacity','.55');
      contactShadowOuter.setAttribute('rx','70');contactShadowOuter.setAttribute('ry','11');contactShadowOuter.setAttribute('opacity','.32');
      contactShadowCore.setAttribute('rx','38');contactShadowCore.setAttribute('ry','4.5');contactShadowCore.setAttribute('opacity','.55');
      worldShadowAttenuated=false;
    }
    // N40 (2026-08-06): the groundImpact call site is REMOVED with its state —
    // S7b retired the ring but left this call referencing the deleted vars,
    // faulting the render subscriber every frame (the S11 take-1/2 wall: the
    // organism froze because the render loop died). The drop shadow is the
    // floor's answer.
    if(debugOn){debugEdges.setAttribute('d',meshEdgePath(mesh));debugPoints.replaceChildren(...mesh.map((p,i)=>{const c=document.createElementNS(NS,'circle');c.setAttribute('cx',p.x.toFixed(2));c.setAttribute('cy',p.y.toFixed(2));c.setAttribute('r',i===selectedVertex?'1.8':'.55');c.setAttribute('data-vertex',String(i));return c;}));renderFaceAnchorDebug();}
    const edited=meshOffsets.reduce((count,offset)=>count+(Math.abs(offset.x)>.001||Math.abs(offset.y)>.001?1:0),0);
    const visibleLayers=[...layerVisibility.values()].filter(Boolean).length;
    const visibleSeconds=idle.phase*IDLE_CYCLE_SECONDS;$('idleCycleBar').style.width=`${(idle.phase*100).toFixed(2)}%`;$('idleCycleStatus').textContent=reducedMotion?'Idle · reduced motion':`Idle · ${visibleSeconds.toFixed(1)} / ${IDLE_CYCLE_SECONDS.toFixed(1)} s`;
    $('readout').innerHTML=`<strong>${formProfile.label.toUpperCase()}</strong><br>${formProfile.note}<br><br><div class="kv"><strong>Geometry</strong><span>decoupled adaptive expression surface</span><strong>View</strong><span>${viewYawDegrees.toFixed(0)}° dial · radial ${effectiveViewYaw().toFixed(0)}° · slice ${(()=>{const _d=effectiveViewYaw(),_dd=(((_d%360)+360)%360),_s=Math.round(_dd/30)%12;return((_s+6-1)%12)+1;})()} o'clock</span><strong>Preview</strong><span>${previewSize}px desktop proof</span><strong>Contour</strong><span>${CONTOUR_SAMPLES} render samples</span><strong>Structure</strong><span>${STRUCTURAL_NODES} nodes / ${ARTICULATION_MESH.triangles.length} triangles</span><strong>Relief</strong><span>${reliefPreset} · ${activeReliefSamples}/${RELIEF_SAMPLES} samples · ${detailTier}</span><strong>Material</strong><span>${materialProfile} · ${visibleLayers}/${MATERIAL_MESH_BINDINGS.length} sources</span><strong>Motion</strong><span>${reducedMotion?'static equivalent':`native ${IDLE_CYCLE_SECONDS}s living hold · ${(idle.phase*100).toFixed(0)}%`}</span><strong>Edited</strong><span>${edited} mesh offsets</span><strong>Presence</strong><span>${faceVisibility>.01?'face active':'featureless dormant identity'}</span><strong>Morph</strong><span>${morphProfileId} → ${nextMorphProfileId} · ${(morphMix*100).toFixed(0)}%</span><strong>Emotion</strong><span>${emotionFamily} · ${EMOTION_FIXTURES[state].label}</span><strong>Transition</strong><span>${transitionFromFixture} → ${transitionToFixture} · ${(transitionProgress(now)*100).toFixed(0)}%</span><strong>Interruptions</strong><span>${interruptionCount}</span></div>`;
    updateRuntimeLabels(now);
    frameMetrics.svgMs.push(performance.now()-svgStarted);const scriptMs=performance.now()-scriptStarted;frameMetrics.frames+=1;frameMetrics.scriptMs.push(scriptMs);for(const values of [frameMetrics.scriptMs,frameMetrics.topologyMs,frameMetrics.normalMs,frameMetrics.reliefMs,frameMetrics.reliefEvaluationMs,frameMetrics.reliefNormalMs,frameMetrics.svgMs,frameMetrics.frameIntervalMs,frameMetrics.lightRigMs])while(values.length>METRIC_WINDOW)values.shift();
    if(proofMode)proofFramePending=false;
    // VEC-401: continuous frames come from organism clock subscription — no self-RAF.
  }

  // VEC-701: the packaged desktop installs this wrapper before the legacy
  // bundle executes. It guards the actual clock-driven render() function, not
  // only imperative requestOneFrame() calls. Standalone HTML remains unchanged.
  if(typeof globalThis.__GASPER_VECTOR_PROJECTION_WRAP_RENDER__==='function'){
    render=globalThis.__GASPER_VECTOR_PROJECTION_WRAP_RENDER__(render);
  }

  referenceToggle.onclick=()=>{const collapsed=referencePanel.classList.toggle('collapsed');referenceToggle.textContent=collapsed?'Show reference':'Hide reference';referenceToggle.setAttribute('aria-expanded',String(!collapsed));};
  $('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume motion':'Pause motion';if(formMasterStandalone){if(paused)organismClock.pause();else organismClock.resume();}};
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
  $('reset').onclick=()=>{state='neutral-settled';emotionFamily='neutral';fixtureIndex=0;transitionFromFixture=state;transitionToFixture=state;transitionStartedAt=organismNow();transitionDuration=EMOTION_FIXTURES[state].transitionSeconds;transitionSerial=0;interruptionCount=0;emotionDemoMode=false;runtimeDormant=false;activeMicrostate=null;activeFixtureBlend=null;behaviorMorphSerial+=1;conversationSerial+=1;behaviorMorphStatus='idle';behaviorProgress=0;expressionPreviewMode='none';eyeRefractoryPreview=null;lastEyeRefractoryFrame=null;laggedEnergy=EMOTION_FIXTURES['neutral-settled'].energy;silhouetteProfile='wispwalker';setYaw(8);userYawEngaged=false;attentionYawTargetDeg=0;attentionYawStrength=0;attentionYawDeg=0;exprBodyFe=0;physSilhouettePlantY=0;headingYawTargetDeg=0;headingYawDeg=0;worldPoseTarget={x:0,y:0,z:0,tilt:0,provenance:'none'};BASE_CONTOUR=createBaseContour();FACE_SURFACE_ANCHORS=createFaceSurfaceAnchors();current={...EMOTION_FIXTURES[state],wide:-1};target={...EMOTION_FIXTURES[state],wide:-1};activeReliefMode='none';elapsed=0;paused=false;debugOn=false;selectedVertex=-1;meshOffsets.forEach(offset=>{offset.x=0;offset.y=0;});debug.setAttribute('opacity','0');stage.classList.remove('editing');coupling.value='1';motion.value='.72';interiorEnergy.value='.72';$('pause').textContent='Pause motion';$('debugToggle').textContent='Inspect mesh';setLayerPreset('master');setPreviewSize(320);setDetailTier('adaptive');setReliefPreset('none');setContainmentMode('all');applyFormPresence();renderSilhouetteProfileButtons();renderEmotionButtons();renderFixtureButtons();syncLabels();updateRuntimeLabels();};
  [coupling,motion,interiorEnergy].forEach(el=>el.addEventListener('input',syncLabels));yaw.addEventListener('input',()=>{userYawEngaged=true;setYaw(yaw.value);}); // S5 A-LAW 3 (expression-attention-phd-memo): the yaw dial is the user OVERRIDE — touching it marks engagement and the attention-yaw carrier target collapses to 0 smoothly (release eases at τ_yaw; never a snap). Initialization paths call setYaw directly and do NOT engage the flag.
  const requestedLayer=query.get('layer');
  if(requestedLayer&&layerVisibility.has(requestedLayer)){MATERIAL_MESH_BINDINGS.forEach(([key])=>layerVisibility.set(key,key===requestedLayer));materialProfile='custom';}
  else if(materialProfile==='baseline')MATERIAL_MESH_BINDINGS.forEach(([key])=>layerVisibility.set(key,baselineLayerSet.has(key)));
  function metricSummary(values){if(!values.length)return{samples:0,mean:0,median:0,p95:0,max:0};const sorted=[...values].sort((a,b)=>a-b),sum=values.reduce((total,value)=>total+value,0),at=quantile=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*quantile))];return{samples:values.length,mean:sum/values.length,median:at(.5),p95:at(.95),max:sorted[sorted.length-1]};}
  function resetFrameMetrics(){for(const key of ['scriptMs','topologyMs','normalMs','reliefMs','reliefEvaluationMs','reliefNormalMs','svgMs','frameIntervalMs','lightRigMs'])frameMetrics[key].length=0;frameMetrics.frames=0;frameMetrics.longTasks=0;frameMetrics.droppedFrames=0;frameMetrics.lastFrameAt=performance.now();}
  function setLightRigGain(value){
    const gain=Math.max(0,Math.min(1,Number(value)||0));
    if(!globalThis.__GASPER_LIVE_COEFFS__)globalThis.__GASPER_LIVE_COEFFS__={};
    if(!globalThis.__GASPER_LIVE_COEFFS__.lightRig)globalThis.__GASPER_LIVE_COEFFS__.lightRig={};
    globalThis.__GASPER_LIVE_COEFFS__.lightRig.lightRigGain=gain;
    if(gain===0)LightRig.reset();
    return gain;
  }
  function getLightRigSnapshot(){
    const numberAttr=(node,name)=>{const value=Number(node.getAttribute(name));return Number.isFinite(value)?value:0;};
    const gain=Math.max(0,Math.min(1,Number(avatar.dataset.lightRigGain)||0));
    return{
      schema:'gasper.tss0.snapshot/v1',
      config:{...LIGHT_RIG},
      enabled:LIGHT_RIG.enabled,
      gain,
      active:gain>0&&numberAttr(tssGlintNode,'opacity')>0,
      yaw:lastLightRigInput?.yaw??effectiveViewYaw(),
      profile:silhouetteProfile,
      glint:{x:numberAttr(tssGlintNode,'cx'),y:numberAttr(tssGlintNode,'cy'),opacity:numberAttr(tssGlintNode,'opacity'),radius:numberAttr(tssGlintNode,'r'),score:Number(avatar.dataset.lightRigGlintScore)||0,index:Number(avatar.dataset.lightRigGlintIndex)||0},
      sheen:{x:numberAttr(tssSheenNode,'cx'),y:numberAttr(tssSheenNode,'cy'),opacity:numberAttr(tssSheenNode,'opacity'),radius:numberAttr(tssSheenNode,'r')},
      rimAverage:Number(avatar.dataset.lightRigRimAvg)||0,
      frameCost:metricSummary(frameMetrics.lightRigMs),
      geometry:{contourSamples:CONTOUR_SAMPLES,structuralNodes:STRUCTURAL_NODES,structuralTriangles:ARTICULATION_MESH.triangles.length,bodyPathLength:($('body').getAttribute('d')||'').length},
      writePolicy:'intensity-and-focal-only'
    };
  }
  function renderProofFrame(deltaMs=1000/60){
    paused=true;
    const delta=Math.max(1,Math.min(1000,Number(deltaMs)||1000/60));
    organismClock.step(delta);
    return getLightRigSnapshot();
  }
  function runLightRigDeterminismProbe(iterations=12,deltaMs=1000/60){
    if(!lastLightRigInput)return{available:false,equal:false,reason:'no-light-rig-input'};
    const count=Math.max(1,Math.min(120,Math.floor(Number(iterations)||12)));
    const dt=Math.max(.001,Math.min(1,(Number(deltaMs)||1000/60)/1000));
    const input={
      yaw:lastLightRigInput.yaw,
      profile:{...lastLightRigInput.profile},
      mesh:lastLightRigInput.mesh.map(point=>({...point})),
      pts:lastLightRigInput.pts.map(point=>({...point})),
      normals:lastLightRigInput.normals.map(normal=>({...normal}))
    };
    const run=()=>{
      LightRig.reset();
      const frames=[];
      for(let index=0;index<count;index+=1){
        const frame=LightRig.evalFrame(input,dt);
        frames.push({glint:{...frame.glint},sheen:{...frame.sheen},score:frame.score,rimAvg:frame.rimAvg,glintIndex:frame.glintIndex});
      }
      return frames;
    };
    const first=run(),second=run();
    const firstJson=JSON.stringify(first),secondJson=JSON.stringify(second);
    LightRig.reset();
    return{available:true,equal:firstJson===secondJson,iterations:count,deltaMs:dt*1000,first,second};
  }
  globalThis.SidekickFormMasterRig={
    setPaused(value){paused=Boolean(value);$('pause').textContent=paused?'Resume motion':'Pause motion';},
    setWorldPose(pose){const p=pose&&typeof pose==='object'?pose:{};const num=(v,fb)=>typeof v==='number'&&Number.isFinite(v)?v:fb;const prov=(typeof p.provenance==='string'&&['scene-authority','physics-authority','capture-drive','curve-authority','wander-authority','life-authority'].includes(p.provenance))?p.provenance:'none';const zc=Math.max(WORLD_SPACE.zNear,Math.min(WORLD_SPACE.zFar,num(p.z,0)));const ws=WORLD_SPACE.homeViewDistance/(WORLD_SPACE.homeViewDistance+zc);const xh=WORLD_SPACE.xHalf/ws,ym=WORLD_SPACE.yMax/ws;worldPoseTarget=prov==='none'?{x:0,y:0,z:0,tilt:0,provenance:'none'}:{x:Math.max(-xh,Math.min(xh,num(p.x,0))),y:Math.max(0,Math.min(ym,num(p.y,0))),z:zc,tilt:Math.max(-WORLD_SPACE.maxTiltDeg,Math.min(WORLD_SPACE.maxTiltDeg,num(p.tilt,0))),provenance:prov};if(paused)requestFormMasterFrame();}, // GASPER-SPACE-001 PHASE A + GASPER-CRAFT-002 S2 (D-0099 Doctrine 2) — world pose intake. Provenance fence (D-0088 idiom applied to space): only scene-authority / physics-authority / capture-drive / curve-authority (GASPER-CRAFT-001 C1 performance packs) / wander-authority (GASPER-CRAFT-002 D-0106 golden-angle idle wander) may move Gasper through the world; anything else fails closed to home. Bounds fence is the FRUSTUM AT THE POSE'S OWN DEPTH: z ∈ [zNear (the monitor glass), zFar (the far fade)], x/y inside the frustum half-width/ceiling at that depth (the space is wider in the distance, narrower at the glass). Authored poses draw EXACTLY — keys are truth; only the home-return transition eases.
    getWorldPose(){return{target:{...worldPoseTarget},applied:{...worldPoseCurrent}};}, // GASPER-SPACE-001 PHASE A — read-back for witness telemetry (applied = the value actually drawn; for any provenance in flight applied === target exactly — keys are truth)
    setPhysicsWake(_vx,_vy){/* N36 / Wave 3: velocity-wake deformation RETIRED; compatibility no-op. */},
    setBooBob(v){physBooBob=(typeof v==='number'&&Number.isFinite(v))?Math.max(-10,Math.min(10,v)):0;if(paused)requestFormMasterFrame();}, // S10 (owner N42) — the Boo perpetual-bob carrier (world units, signed lift, clamp ±10 ≈ the ±2.3 px expression with margin). 0 outside boo mode; the use site gates it on reduced motion ONLY (the ghost never stands — rest keeps breathing).
    setPhysicsLight(s){physLight=typeof s==='number'&&Number.isFinite(s)?Math.max(0,Math.min(12,s)):0;if(paused)requestFormMasterFrame();}, // GASPER-SPACE-001 PHASE B (D-0090) — physics-authority motion-light feed in living-speed units; MOTION_LIGHT takes max(momentumSpeed, physLight) while living motion is on. Clamped 0..12; zero at rest = identity.
    setPhysicsTake(t){physTake=typeof t==='number'&&Number.isFinite(t)?Math.max(0,Math.min(1,t)):0;if(paused)requestFormMasterFrame();},
    setPhysicsIdle(v){physIdle=typeof v==='number'&&Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;if(paused)requestFormMasterFrame();},
    getPaintProbe(){const body=document.querySelector('#body');let hull=null;try{const b=body&&body.getBBox?body.getBBox():null;if(b)hull={x:b.x,y:b.y,w:b.width,h:b.height};}catch(_){}const starIds=['fleck-01','fleck-02','fleck-03'];const stars=starIds.map(id=>{const n=document.getElementById(id);return n?{id,cx:Number(n.getAttribute('cx')),cy:Number(n.getAttribute('cy'))}:null;});const ok=stars.filter(Boolean);const starCentroid=ok.length?{x:ok.reduce((s,f)=>s+f.cx,0)/ok.length,y:ok.reduce((s,f)=>s+f.cy,0)/ok.length}:null;const legacy=[...document.querySelectorAll('#cosmicFlecks circle')].slice(0,3).map((n,i)=>({id:'legacy-'+i,cx:Number(n.getAttribute('cx')),cy:Number(n.getAttribute('cy'))}));const _lifeCfgP=(globalThis.__GASPER_LIVE_COEFFS__||{}).life||{};return{physIdle,postureScaleY:current.postureScaleY,volumeY:(current.postureScaleY||1),overall_height:current.postureScaleY,hull,stars,starCentroid,legacyStars:legacy,motion:Number(motion.value),restFloor:Number(_lifeCfgP.restFloor)||0,setPhysicsIdle:true};},
    setPhysicsGait(g,screen){const p=g&&typeof g==='object'?g:{};const s=screen&&typeof screen==='object'?screen:{};const n=(v,fb)=>typeof v==='number'&&Number.isFinite(v)?v:fb;physGait={phase:Math.max(-1e4,Math.min(1e4,n(p.phase,0))),stepHz:Math.max(0,Math.min(20,n(p.stepHz,0))),bobUnits:Math.max(0,Math.min(400,n(p.bobUnits,0))),leanDeg:Math.max(-18,Math.min(18,n(p.leanDeg,0))),swayUnits:Math.max(0,Math.min(280,n(p.swayUnits,0))),speedRatio:Math.max(0,Math.min(1,n(p.speedRatio,0))),bobLiftUnits:Math.max(-720,Math.min(720,n(s.bobLiftUnits,0))),swayXUnits:Math.max(-280,Math.min(280,n(s.swayXUnits,0))),rollDeg:Math.max(-16,Math.min(16,n(s.rollDeg,0))),contactSquash:Math.max(0,Math.min(0.05,n(s.contactSquash,0))),stepBaseXUnits:Math.max(-280,Math.min(280,n(s.stepBaseXUnits,0))),plantedScreenXUnits:Math.max(-918,Math.min(918,n(s.plantedScreenXUnits,0))),bankDeg:Math.max(-12.94427190999916,Math.min(12.94427190999916,n(s.bankDeg,0))),stepFlattenUnits:Math.max(-61.2,Math.min(61.2,n(s.stepFlattenUnits,0))),stepFlattenWidthUnits:Math.max(0,Math.min(144,n(s.stepFlattenWidthUnits,0))),plantedCompress:Math.max(0,Math.min(1,n(s.plantedCompress,0))),incomingCompress:Math.max(0,Math.min(1,n(s.incomingCompress,0))),hopMix:Math.max(0,Math.min(1,n(s.hopMix,0))),flight:Math.max(0,Math.min(1,n(s.flight,0))),seated:s.seated===true,leftoverSway:Math.max(0,Math.min(1,n(s.leftoverSway,0))),supportSide:Math.max(-1,Math.min(1,n(s.supportSide,0))),swingLiftUnits:Math.max(0,Math.min(1600,n(s.swingLiftUnits,0))),swingAdvanceUnits:Math.max(-640,Math.min(640,n(s.swingAdvanceUnits,0))),loadedDropUnits:Math.max(0,Math.min(400,n(s.loadedDropUnits,0))),swingClearance:Math.max(0,Math.min(1,n(s.swingClearance,0)))};if(paused)requestFormMasterFrame();}, // PRESSURE-COOKER CYCLE 1 (gait-expression-phd-memo) — physics-authority gait intake. Fail-closed fences: bob ≤ 10% h_G, sway ≤ 5% h_G, lean ≤ the L6 clamp, hz ≤ 20 (perception ceiling); CYCLE 4 (walk-weight-transfer-phd-memo): vault roll ≤ 5°, contact squash ≤ 5% (the T3 family ceiling); CYCLE 5 (step-cycle-phd-memo): planted base ≤ sway fence (amplitude = L7 swayUnits, S0); CYCLE 10 (bank-phd-memo): bank ≤ φ·8° ≈ 12.944° (Y3 — inside the friction cone atan(1/φ²) ≈ 20.89°); CYCLE 11 (step-shape-phd-memo): flatten depth ≤ 5% h_G = 61.2 u, patch half-width ≤ 25 % of the base half-width = 144 u (Z2); corrupt input collapses each channel to its rest value. The renderer expresses; the kernel derives. Zero gait => byte-identical raster (additive + reversible, D-0088 idiom).
    setPhysicsWind(p,dirX){const np=typeof p==='number'&&Number.isFinite(p)?Math.max(0,Math.min(1,p)):0;const nd=typeof dirX==='number'&&Number.isFinite(dirX)?Math.max(-1,Math.min(1,dirX)):0;physWind={pressure:np,dirX:nd};if(paused)requestFormMasterFrame();}, // S4 F-LAW 2 (flight-physics-phd-memo, owner N31) — wind-resistance intake: the kernel's lagged dynamic pressure p = (v/v_c)^2 + the screen-x travel direction. Fail-closed fences: p ∈ [0,1] (the law bounds it — cruise is the reference speed), dirX ∈ [−1,1]; corrupt input collapses to still air. The renderer expresses trail-stretch / lead-compress from it (windStretchRadiusDelta); zero at rest = byte-identical contour (D-0088 idiom).
    setFaceEnergy(e){physFaceEnergy=typeof e==='number'&&Number.isFinite(e)?Math.max(0,Math.min(1,e)):0;if(paused)requestFormMasterFrame();}, // GASPER-CRAFT-001 · C4 — face-energy carrier intake (curve-authority face channel, AU-named face beats). Clamped 0..1; zero at rest = identity. Folds into composeFixtureMotion as the FACE_ENERGY_SHAPE (TS mirror) smile shape, bounded by the existing no-pinch clamps.
    setGroundImpact(p,x,z){/* N40 (2026-08-06): impact-ripple intake RETIRED — no-op fail-closed (owner: drop shadow is the floor answer) */},
    disposeOrganismClockSubscription(){disposeFormMasterClockSubscription();},
    inspectOrganismClock(){return organismClock.inspect();},
    setMotion(value){motion.value=String(Math.max(0,Math.min(1,Number(value)||0)));syncLabels();},
    setLifeScale(value){lifeScale=Math.max(0,Math.min(3,Number(value)||0));if(paused)requestFormMasterFrame();},
    getLifeScale(){return lifeScale;},
    setExternalBlinkAuthority(v){externalBlinkAuthority=!!v;},
    setExternalEyeAperture(v){externalEyeAperture=(typeof v==='number'&&Number.isFinite(v))?v:null;},
    setExternalGaze(x,y,s){externalGazeTX=(typeof x==='number'&&Number.isFinite(x))?Math.max(-1,Math.min(1,x)):0;externalGazeTY=(typeof y==='number'&&Number.isFinite(y))?Math.max(-1,Math.min(1,y)):0;externalGazeS=(typeof s==='number'&&Number.isFinite(s))?Math.max(0,Math.min(1,s)):0;if(paused)requestFormMasterFrame();}, // GASPER-ALIVE-001 (D-0108) — attention intake: normalized look direction (−1..1 each axis) + strength 0..1; the renderer pursues with its own tau and folds into lookX/lookY + body lean (eyes lead, §7.3); motionStrength-gated so reduced motion collapses it; strength 0 releases back into the living aperiodic gaze. Fail-closed: non-finite inputs read as release.
    setAttentionYaw(deg,s){attentionYawTargetDeg=(typeof deg==='number'&&Number.isFinite(deg))?Math.max(-AUTHORED_YAW_RANGE[1]/AMORPH_PHI,Math.min(AUTHORED_YAW_RANGE[1]/AMORPH_PHI,deg)):0;attentionYawStrength=(typeof s==='number'&&Number.isFinite(s))?Math.max(0,Math.min(1,s)):0;if(paused)requestFormMasterFrame();}, // S5 · A-LAW 1/3 (expression-attention-phd-memo) — attention-yaw intake (consonant C7): the body turns to address. Forwarded by the rig controller through the SAME gaze seam (every release path releases the yaw too). Fail-closed fences: setpoint ∈ ±45/φ° (the golden cut of the authored turntable range — the dial owns the whole range, attention owns the cut), strength ∈ [0,1]; corrupt input reads as frontal release. The renderer pursues at τ_c·φ³ (render loop) and composes additively over the dial yaw, fenced to ±45° (effectiveViewYaw). Strength 0 releases back to frontal. Zero at rest = byte-identical (D-0088 idiom).
    setHeadingYaw(deg){headingYawTargetDeg=(typeof deg==='number'&&Number.isFinite(deg))?Math.max(-180,Math.min(180,deg)):headingYawTargetDeg;if(paused)requestFormMasterFrame();}, // S8 · (illustrator-turntable-2p5d-phd-memo) — travel-facing intake: CONTINUOUS paint yaw (no slice quantize, no cone fold). FAIL-CLOSED TO HOLD. Renderer pursues shortest-arc at τ·φ².
    setEightState(id){const raw=(typeof id==='string')?id:'';if(!raw){avatar.dataset.eightState=eightStateId;return;}const next=EIGHT_STATE_BODY.recipe[raw]?raw:eightStateId;if(next!==eightStateId){eightStateId=next;stateGestureAge=0;const _goosePreset=raw==='presence-recognition-spark'?'goosebumps':raw==='comet-executing-drive'?'goosebumps':raw==='presence-pleased-resolve'?'goosebumps_soft':'none';setReliefPreset(_goosePreset,{manual:true});}avatar.dataset.eightState=raw;}, // D-0082: goosebump relief preset moves INSIDE the state-change branch — the living loop forwards the eight-state id EVERY flush (GasperRigController:610), so the unconditional setReliefPreset('none') stomped any manual/API preset within a frame and D-0080's manual flag could not help (observed live: setReliefPreset('cheek_dimple') -> snapshot 'none' 600ms later). The loop still owns the preset per D-0074, but only on an actual state change. D-0049 M1: live eight-state id -> in-renderer body recipe; re-trigger entry gesture only on change; unknown ids (e.g. wake) => neutral recipe (dataset keeps the raw id for honest telemetry). D-0074: eight-state goosebump system — recognition+executing full, pleased soft, others none (the loop owns the relief preset per state). D-0080: manual=true so applyEmotionRelief won't stomp the loop's preset.
    setEightStateEnabled(v){eightStateBodyEnabled=!!v;}, // D-0049: runtime kill-switch for the per-state body recipe (false => byte-identical fallback)
    // V1 TURBO LIVE-SCULPT: runtime gauss coefficient overrides + body channel access.
    setLiveFormCoeff(profile,key,value){setLiveFormCoeff(profile,key,value);},
    getLiveFormCoeffs(profile){return globalThis.__GASPER_LIVE_COEFFS__?.[profile]?{...globalThis.__GASPER_LIVE_COEFFS__[profile]}:{};},
    requestOneFrame(){return requestFormMasterFrame();},setProfile(value,settle){demoMode=false;if(settle==='settle'||settle===true){behaviorMorphSerial+=1;gasperMorphSerial+=1;manualMorph=null;setSilhouetteProfile(value,true);if(paused)requestFormMasterFrame();return;}if(FORM_PROFILES[value]&&value!==silhouetteProfile){void morphToBehavioral(value,{durationMs:1618});if(paused)requestFormMasterFrame();return;}if(paused)requestFormMasterFrame();},
    setEmotion(family,index=0){emotionDemoMode=false;setEmotionFamily(family,index,{source:'api'});},
    setFixture(id){emotionDemoMode=false;setEmotionFixture(id,{source:'api'});},
    setFixtureImmediate(id){emotionDemoMode=false;setFixtureImmediate(id);},
    applyCanonicalProjection(packet){applyCanonicalProjection(packet);},
    setExpressionPreview(from,to,mix){emotionDemoMode=false;setExpressionPreview(from,to,mix);},
    setExpressionTransitionPreview(from,to,progress){emotionDemoMode=false;return setExpressionTransitionPreview(from,to,progress);},
    /**
     * Apply modern semantic pose (eye_openness, crown_height, …) into FormMaster
     * current/target and force a paint. Used by Studio/MCP scrub without native mixer.
     */
    applySemanticPose(pose){
      const p=pose&&typeof pose==='object'?pose:{};
      const num=(k)=>{const v=p[k];return typeof v==='number'&&Number.isFinite(v)?v:null;};
      const _livingVol=num('unified_volume_scale_y')!==null;
      let e=num('eye_openness'); if(e!==null&&!externalBlinkAuthority){const open=Math.max(0.5,Math.min(1.2,e*1.08));current.eyeOpenL=open;current.eyeOpenR=open;target.eyeOpenL=open;target.eyeOpenR=open;}
      e=num('eyeOpenL'); if(e!==null){current.eyeOpenL=e;target.eyeOpenL=e;}
      e=num('eyeOpenR'); if(e!==null){current.eyeOpenR=e;target.eyeOpenR=e;}
      e=num('mouth_openness'); if(e!==null){current.mouthOpen=e;target.mouthOpen=e;}
      e=num('mouthOpen'); if(e!==null){current.mouthOpen=e;target.mouthOpen=e;}
      e=num('mouth_width'); if(e!==null){current.mouthWidth=e;target.mouthWidth=e;}
      e=num('gaze_x'); if(e!==null){current.focusX=e;target.focusX=e;}
      e=num('gaze'); if(e!==null){current.focusX=e;target.focusX=e;}
      e=num('gaze_y'); if(e!==null){current.postureY=e*8;target.postureY=e*8;}
      e=num('crown_height'); if(e!==null){current.crown=e;target.crown=e;}
      e=num('brow_tension'); if(e!==null){current.browL=e;current.browR=e;target.browL=e;target.browR=e;current.tension=Math.max(current.tension||0,e);target.tension=current.tension;}
      e=num('cheek_tension'); if(e!==null){current.cheekL=e;current.cheekR=e;target.cheekL=e;target.cheekR=e;}
      e=num('energy_level'); if(e!==null){current.energy=e;target.energy=e;try{interiorEnergy.value=String(e);}catch(_){}}
      e=num('overall_width'); if(e!==null&&!_livingVol){current.postureScaleX=e;target.postureScaleX=e;if(bodyHeld&&heldFrameState)heldFrameState.postureScaleX=e;} // D-0088 scene-scoped silhouette admission: forward through the D-0018 settled-hold. The hold pins frameState for a bit-stable at-rest raster (kills high-Hz buzz), which also froze the owner-approved scene-suite squash&stretch (the crown/wide/low state-levers bypass the hold; postureScale lives INSIDE the pinned frameState). Scene curves are C-inf slow (multi-second movements) => no buzz reintroduced; idle transform + cycleSeconds stay pinned. Un-hold composes from current => continuous.
      e=num('overall_height'); if(e!==null&&!_livingVol){current.postureScaleY=e;target.postureScaleY=e;if(bodyHeld&&heldFrameState)heldFrameState.postureScaleY=e;physSilhouettePlantY=(1-e)*84;} // D-0088 (same settled-hold forward for the height channel) + R3 base-anchored re-plant (exprBodyFe idiom, arm=84); e=1 => plant 0
      e=num('face_scale'); if(e!==null){/* faceScale via posture */ current.postureScaleX=(current.postureScaleX||1)*(0.85+0.15*e); target.postureScaleX=current.postureScaleX;}
      e=num('lower_body_fullness'); if(e!==null){current.low=e;target.low=e;}
      // V1 TURBO LIVE-SCULPT: body channels already consumed by sampleBodyForProfile
      // (asym/bodyLean/postureX/postureY/wide) but not previously exposed here.
      e=num('asym'); if(e!==null){current.asym=e;target.asym=e;}
      e=num('body_lean'); if(e!==null){current.bodyLean=e;target.bodyLean=e;}
      e=num('posture_x'); if(e!==null){current.postureX=e;target.postureX=e;}
      e=num('posture_y'); if(e!==null){current.postureY=e;target.postureY=e;}
      e=num('wide'); if(e!==null){current.wide=e;target.wide=e;}
      // V1 TURBO LIVE-SCULPT: per-profile gauss coefficient overrides (formRadiusAtFor).
      // Applied to the active silhouetteProfile so the panel sculpts what you see.
      e=num('form_crown_amp'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'crownAmp',e);}
      e=num('form_chin_amp'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'chinAmp',e);}
      e=num('form_lobe_amp'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'lobeAmp',e);}
      e=num('form_cleft_depth'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'cleftDepth',e);}
      // V2.2/V2.3 TURBO LIVE-SCULPT: wispwalker nub feet/arms + walk-in-place coefficients.
      e=num('form_foot_amp'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'footAmp',e);}
      e=num('form_arm_amp'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'armAmp',e);}
      e=num('walk_amp'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'walkAmp',e);}
      e=num('walk_period'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'walkPeriod',e);}
      e=num('walk_accent'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'walkAccent',e);}
      e=num('walk_enable'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'walkEnable',e);}
      e=num('step_depth'); if(e!==null){setLiveFormCoeff(silhouetteProfile,'stepDepth',e);} // V2.5 WALK-STEP (D-0021)
      e=num('visco_tau'); if(e!==null){viscoTau=Math.max(0.02,Math.min(1.0,e));} // V2.6 (D-0022): live-tunable viscoelastic weight
      e=num('gaze_amp'); if(e!==null){gazeAmpLive=Math.max(0,Math.min(2,e));} // V2.7 (D-0024): live-tunable gaze/attention amplitude
      e=num('orient_lean'); if(e!==null){gazeLeanFactor=Math.max(0,Math.min(1.5,e));} // D-0025: body-lean follow strength (the orient)
      e=num('recogn'); if(e!==null){gazeRecogAmp=Math.max(0,Math.min(1,e));} // D-0025: recognition "aha" dilation strength
      e=num('morph_impact'); if(e!==null){morphImpactLive=Math.max(0,Math.min(.24,e));} // D-0029 initiation cost
      e=num('morph_spread'); if(e!==null){morphSpreadLive=Math.max(0,Math.min(.18,e));} // D-0029 mass transfer
      e=num('morph_settle'); if(e!==null){morphSettleLive=Math.max(0,Math.min(.16,e));} // D-0029 residual damping
      e=num('motion'); if(e!==null){try{motion.value=String(Math.max(0,Math.min(1,e)));}catch(_){}}
      e=num('yaw'); if(e!==null){try{setYaw(e);}catch(_){}}
      e=num('relief_amplitude'); if(e!==null){reliefAmplitudeLive=e<=0.02?0:Math.max(0,Math.min(2.5,e/0.45));} // D-0084: dais Relief slider — continuous intensity over the active preset (rail fallback 0.45 = authored unity; <=0.02 = flat)
      // Reversible facial tournament keys (runtime-only; does not mutate EMOTION_FIXTURES).
      // Used by DOPS-01B neutral-face tournament capture; production fixture remains baseline.
      for (const k of ['eyeTiltL','eyeTiltR','eyeLiftL','eyeLiftR','eyeWidthL','eyeWidthR','mouthWidth','mouthCurve','pullL','pullR','mouthLift','mouthSkew','mouthPinch','mouthRound','energy','tension','glowLag']) {
        e=num(k); if(e!==null){current[k]=e;target[k]=e; if(k==='energy'){try{interiorEnergy.value=String(e);}catch(_){}}}
      }
      // Hold authored pose: freeze transition on current
      transitionFromFixture=state;transitionToFixture=state;transitionStartedAt=organismNow()-1e6;
      try{requestRuntimeFrame();}catch(_){}
      if(paused)try{requestFormMasterFrame();}catch(_){}
    },
    getExpressionState(){return{...current};},inspectHold(){return lastHoldPaint?{...lastHoldPaint,stars:lastHoldPaint.stars?{...lastHoldPaint.stars}:null}:null;},
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
    setMorphPreview(from,to,mix){if(!FORM_PROFILES[from]||!FORM_PROFILES[to])throw new TypeError('unknown morph profile');manualMorph={from,to,mix:Math.max(0,Math.min(1,Number(mix)||0)),rawProgress:Math.max(0,Math.min(1,Number(mix)||0)),transitionArc:null};demoMode=false;silhouetteProfile=from;applyFormPresence();renderSilhouetteProfileButtons();},
    setMorphTransitionPreview(from,to,progress,options){return setMorphTransitionPreview(from,to,progress,options);},
    clearMorphPreview(){manualMorph=null;demoMode=false;},
    setDemoMode(value){manualMorph=null;demoMode=Boolean(value);elapsed=0;demoLastPhase=0;},
    setYaw(value){setYaw(value);},
    setLightRigGain(value){return setLightRigGain(value);},
    getLightRigSnapshot(){return getLightRigSnapshot();},
    stepLightRigProofFrame(deltaMs){return renderProofFrame(deltaMs);},
    runLightRigDeterminismProbe(iterations,deltaMs){return runLightRigDeterminismProbe(iterations,deltaMs);},
    setDetailTier(value){setDetailTier(value);},
    setReliefPreset(value){setReliefPreset(value,{manual:true});},
    setContainmentMode(value){setContainmentMode(value);},
    resetFrameMetrics(){resetFrameMetrics();},
    getSnapshot(){const profile=FORM_PROFILES[silhouetteProfile],view=getViewMetrics(profile),depths=lastMeshPoints.map(point=>point.projectedDepth).filter(Number.isFinite);return{candidate:'v6.5.5-gasper-behavioral-continuity',profile:silhouetteProfile,morph:manualMorph?{...manualMorph}:null,demoMode,geometryModel:profile.geometryModel||'radial-shared-topology',containmentMode,paused,motion:Number(motion.value),contourSamples:CONTOUR_SAMPLES,structuralNodes:STRUCTURAL_NODES,structuralTriangles:ARTICULATION_MESH.triangles.length,reliefSamples:RELIEF_SAMPLES,activeReliefSamples,detailTier,reliefPreset,featureless:!profile.face,discStrength:profile.disc||0,lensedStrength:profile.lensed||0,tailPolicy:profile.tailPolicy||'not-applicable',viewYawDegrees,topologyStable:true,materialReprojected:true,projection:view.projection,projectedDepthRange:depths.length?[Math.min(...depths),Math.max(...depths)]:[0,0],viewDepthRole:view.viewDepthRole,tailOpacity:0,discPerspective:view.discPerspective,rotationReady:false,productionReady:false,viewRig:VIEW_RIG_CONTRACT,emotionFamily,emotionFixture:state,emotionTransition:{from:transitionFromFixture,to:transitionToFixture,progress:transitionProgress(),serial:transitionSerial},interruptionCount,emotionDemoMode,runtimeDormant,fixtureCount:Object.keys(EMOTION_FIXTURES).length,emotionFamilyCount:EMOTION_ORDER.length,dormantFamilyNative:true,detachedSingularityLayer:false,transitionArc:manualMorph?.transitionArc?{...manualMorph.transitionArc}:null,eyeRefractory:lastEyeRefractoryFrame?{...lastEyeRefractoryFrame}:null,expressionPreviewMode,morphPhysicsTuning:{impact:morphImpactLive,spread:morphSpreadLive,settle:morphSettleLive},dormantContinuum:{singularityWeight:manualMorph?profileWeight(manualMorph.from,manualMorph.to,manualMorph.mix,'singularity'):(silhouetteProfile==='singularity'?1:0),orbitWeight:manualMorph?profileWeight(manualMorph.from,manualMorph.to,manualMorph.mix,'dormant-orbit'):(silhouetteProfile==='dormant-orbit'?1:0)},behavior:getBehaviorState(),fixtureBlendActive:Boolean(activeFixtureBlend),microstateActive:activeMicrostate?.id||null,embodimentRoutePolicy:'continuity-preserving-recovery',emotionalCurrentStateRetargeting:true,dormantContextRestoration:true,canonicalField:{packet:canonicalProductionField.packet,active:canonicalProductionField.active,revision:canonicalProductionField.revision,sourceHash:canonicalProductionField.sourceHash,domains:Object.fromEntries(Object.entries(canonicalProductionField.domains).map(([key,value])=>[key,Object.keys(value||{})]))},lightRig:getLightRigSnapshot()};},
    getFrameMetrics(){return{frames:frameMetrics.frames,droppedFrames:frameMetrics.droppedFrames,longTasks:frameMetrics.longTasks,script:metricSummary(frameMetrics.scriptMs),topology:metricSummary(frameMetrics.topologyMs),normalDerivation:metricSummary(frameMetrics.normalMs),relief:metricSummary(frameMetrics.reliefMs),reliefEvaluation:metricSummary(frameMetrics.reliefEvaluationMs),reliefNormalDerivation:metricSummary(frameMetrics.reliefNormalMs),svgMutation:metricSummary(frameMetrics.svgMs),frameInterval:metricSummary(frameMetrics.frameIntervalMs),lightRig:metricSummary(frameMetrics.lightRigMs),targetHz:Number(query.get('hz'))||60};},
    getBenchmarkSamples(){return{scriptMs:[...frameMetrics.scriptMs],topologyMs:[...frameMetrics.topologyMs],normalMs:[...frameMetrics.normalMs],reliefMs:[...frameMetrics.reliefMs],reliefEvaluationMs:[...frameMetrics.reliefEvaluationMs],reliefNormalMs:[...frameMetrics.reliefNormalMs],svgMs:[...frameMetrics.svgMs],frameIntervalMs:[...frameMetrics.frameIntervalMs],lightRigMs:[...frameMetrics.lightRigMs]};},
  };
  globalThis.SidekickFormMasterRig.getPressureMaterialSnapshot=()=>Object.freeze({...pressureMaterialResponse});
  globalThis.SidekickAdaptiveRig=globalThis.SidekickFormMasterRig;globalThis.SidekickFormRig=globalThis.SidekickFormMasterRig;
  const gasperRuntimeEvents=new Map();
  let gasperDeterministicTimeMs=null;
  let gasperDeterministicSeed=654;
  const gasperCapabilities=Object.freeze({
    nativeContract:true,
    semanticEmbodiments:true,
    emotionalFixtures:true,
    deterministicTime:true,
    deterministicSeed:true,
    exactMorphProgress:true,
    currentStateRetargeting:true,
    frameMetrics:true,
    lightRigProof:true,
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
  function gasperSetEmbodiment(name,options={}){if(!FORM_PROFILES[name])throw new TypeError('unknown embodiment');demoMode=false;if(options.immediate===true){manualMorph=null;setSilhouetteProfile(name,true);applyFormPresence();}else if(name!==silhouetteProfile){void morphToBehavioral(name,{durationMs:Number(options.durationMs)||1618});}else if(options.immediate!==false){applyFormPresence();}gasperEmit('embodimentchange',{name,options});return gasperMetadata();}
  function gasperSetFixture(family,fixture,options={}){const id=fixture||EMOTION_FAMILIES[family]?.[0];if(!id||!EMOTION_FIXTURES[id]||EMOTION_FIXTURES[id].family!==family)throw new TypeError('unknown fixture');if(options.immediate)globalThis.SidekickFormMasterRig.setFixtureImmediate(id);else globalThis.SidekickFormMasterRig.setFixture(id);gasperEmit('fixturechange',{family,fixture:id,options});return gasperMetadata();}
  function gasperSetMorphProgress(from,to,progress){globalThis.SidekickFormMasterRig.setMorphPreview(from,to,Math.max(0,Math.min(1,Number(progress)||0)));gasperEmit('morphprogress',{from,to,progress:Math.max(0,Math.min(1,Number(progress)||0))});return gasperMetadata();}
  async function gasperMorphTo(name,options={}){if(!FORM_PROFILES[name])throw new TypeError('unknown embodiment');const serial=++gasperMorphSerial;const snapshot=globalThis.SidekickFormMasterRig.getSnapshot();const from=snapshot.morph?(snapshot.morph.mix>=.5?snapshot.morph.to:snapshot.morph.from):snapshot.profile;const duration=Math.max(0,Number(options.durationMs??900));if(duration===0){gasperSetEmbodiment(name);return gasperMetadata();}return new Promise(resolve=>{const started=organismNow();const subId='formmaster-gasper-morph-'+serial;let unsub=null;function finish(meta){if(unsub){unsub();unsub=null;}resolve(meta);}unsub=subscribeFormMasterClock({id:subId,priority:50,onFrame:function(frame){if(serial!==gasperMorphSerial)return finish(gasperMetadata());const p=Math.max(0,Math.min(1,(frame.timeMs-started)/duration));const eased=options.easing==='linear'?p:(p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2);gasperSetMorphProgress(from,name,eased);if(p>=1){globalThis.SidekickFormMasterRig.clearMorphPreview();gasperSetEmbodiment(name);gasperEmit('settled',{embodiment:name});finish(gasperMetadata());}}});ensureFormMasterClockSubscription();});}
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
    pause(){globalThis.SidekickFormMasterRig.setPaused(true);organismClock.pause();gasperEmit('pause');return gasperMetadata();},
    resume(){gasperDeterministicTimeMs=null;globalThis.SidekickFormMasterRig.setPaused(false);organismClock.resume();gasperEmit('resume');return gasperMetadata();},
    stepFrame(){globalThis.SidekickFormMasterRig.setPaused(true);organismClock.step(1000/60);gasperEmit('frame',{elapsed});return gasperMetadata();},
    setDeterministicTime(milliseconds){gasperDeterministicTimeMs=Math.max(0,Number(milliseconds)||0);globalThis.SidekickFormMasterRig.setPaused(true);organismClock.setDeterministicTime(gasperDeterministicTimeMs);gasperEmit('deterministictime',{milliseconds:gasperDeterministicTimeMs});return gasperMetadata();},
    setDeterministicSeed(seed){gasperDeterministicSeed=(Number(seed)||654)>>>0;organismClock.setSeed(gasperDeterministicSeed);document.documentElement.dataset.deterministicSeed=String(gasperDeterministicSeed);gasperEmit('deterministicseed',{seed:gasperDeterministicSeed});return gasperDeterministicSeed;},
    resetDeterminism(){gasperDeterministicTimeMs=null;gasperDeterministicSeed=654;organismClock.reset({seed:654,timeMs:0});organismClock.step(0);document.documentElement.dataset.deterministicSeed='654';return gasperMetadata();},
    captureMetadata(){return gasperMetadata();},
    setLightRigGain(value){const gain=setLightRigGain(value);gasperEmit('lightriggain',{gain});return gain;},
    getLightRigSnapshot(){return getLightRigSnapshot();},
    stepLightRigProofFrame(deltaMs){return renderProofFrame(deltaMs);},
    runLightRigDeterminismProbe(iterations,deltaMs){return runLightRigDeterminismProbe(iterations,deltaMs);},
    getPerformanceSnapshot(){return globalThis.SidekickFormMasterRig.getFrameMetrics();},
    getGeometryMetrics(){const snapshot=globalThis.SidekickFormMasterRig.getSnapshot();return{contourSamples:snapshot.contourSamples,structuralNodes:snapshot.structuralNodes,structuralTriangles:snapshot.structuralTriangles,reliefSamples:snapshot.reliefSamples,activeReliefSamples:snapshot.activeReliefSamples,topologyStable:snapshot.topologyStable,bodyPathLength:($('body').getAttribute('d')||'').length,projectedDepthRange:snapshot.projectedDepthRange};},
    subscribe(eventName,callback){if(typeof callback!=='function')throw new TypeError('callback must be a function');if(!gasperRuntimeEvents.has(eventName))gasperRuntimeEvents.set(eventName,new Set());gasperRuntimeEvents.get(eventName).add(callback);return()=>GASPER_RUNTIME.unsubscribe(eventName,callback);},
    unsubscribe(eventName,callback){return gasperRuntimeEvents.get(eventName)?.delete(callback)||false;},
    setLifeScale(value){globalThis.SidekickFormMasterRig.setLifeScale(value);gasperEmit('lifescale',{value:lifeScale});return gasperMetadata();},
    getLifeScale(){return globalThis.SidekickFormMasterRig.getLifeScale();},
  };
  globalThis.__SIDEKICKEX__=Object.freeze(GASPER_RUNTIME);
  document.documentElement.dataset.sidekickRuntime='native_contract';
  document.documentElement.dataset.character='gasper';
  // VEC-802: isolate historical iframe postMessage control as external-authoring
  // compatibility only. Packaged desktop mounts use the typed organism clock
  // (formMasterStandalone=false) and must not accept hot-path control that bypasses
  // GasperRigController → compositor → projection lease. Opt-in:
  // globalThis.__GASPER_EXTERNAL_AUTHORING_BRIDGE__ === true
  if(formMasterStandalone||globalThis.__GASPER_EXTERNAL_AUTHORING_BRIDGE__===true){
    addEventListener('message',event=>{const message=event.data;if(!message||message.type!=='sidekick-form-control')return;if('paused'in message)globalThis.SidekickFormMasterRig.setPaused(message.paused);if('motion'in message)globalThis.SidekickFormMasterRig.setMotion(message.motion);if('detailTier'in message)globalThis.SidekickFormMasterRig.setDetailTier(message.detailTier);if('reliefPreset'in message)globalThis.SidekickFormMasterRig.setReliefPreset(message.reliefPreset);if(message.morph)globalThis.SidekickFormMasterRig.setMorphPreview(message.morph.from,message.morph.to,message.morph.mix);if(message.emotion)globalThis.SidekickFormMasterRig.setEmotion(message.emotion.family,message.emotion.index||0);if(message.fixture)globalThis.SidekickFormMasterRig.setFixture(message.fixture);if(message.interrupt)globalThis.SidekickFormMasterRig.interrupt(message.interrupt.family||'blocked',message.interrupt.index||0);});
  }
  initStageWorld(); // GASPER-CRAFT-001 · C3: void → place — vector environment injected into #avatar before the first frame (additive art; rig asset bytes untouched)
  renderMaterialLayerControls();renderMaterialProfileButtons();renderSilhouetteProfileButtons();renderEmotionButtons();renderFixtureButtons();renderBehaviorControls();renderPreviewButtons();renderAdaptiveControls();renderContainmentControls();setYaw(viewYawDegrees);applyEmotionRelief(EMOTION_FIXTURES[state]);setYaw(viewYawDegrees);applyFormPresence();applyLayerVisibility();syncLabels();updateRuntimeLabels();avatar.dataset.character='gasper';avatar.dataset.identityLock='v1';avatar.dataset.behaviorConstitution='v1';avatar.dataset.emotion=emotionFamily;avatar.dataset.fixture=state;ensureFormMasterClockSubscription();if(proofMode)requestRuntimeFrame();else if(formMasterStandalone)organismClock.start({mode:'realtime'});
  // Ready signal remains compatibility-only for external iframe hosts; not a control plane.
  if(parent!==window)parent.postMessage({type:'sidekick-form-ready',profile:silhouetteProfile},'*');
})();
