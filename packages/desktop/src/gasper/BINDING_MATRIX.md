# Binding matrix (Gasper Dais)

| id | group | min | max | default | affected nodes |
|----|-------|-----|-----|---------|----------------|
| overall_width | form | 0.35 | 1.65 | 1 | host scale X |
| overall_height | form | 0.35 | 1.65 | 1 | host scale Y |
| crown_height | form | 0 | 1 | 0 | host Y offset |
| lower_body_fullness | form | 0.35 | 1.65 | 1 | host scale Y bias |
| ground_flattening | form | 0 | 1 | 0 | host scale + contactShadow rx |
| face_scale | face | 0.35 | 1.65 | 1 | #faceRecessLayer |
| eye_openness | face | 0 | 1 | 0.55 | #eyeL #eyeR |
| eye_spacing | face | -1 | 1 | 0 | #eyeL #eyeR |
| gaze | face | -1 | 1 | 0 | eyes |
| mouth_openness | face | 0 | 1 | 0.35 | #mouth |
| mouth_width | face | 0.35 | 1.65 | 1 | #mouth |
| corner_pull_l/r | face | -1 | 1 | 0 | #mouth |
| internal_glow | light | 0 | 1 | 0.5 | #innerVolumePath |
| key_intensity | light | 0 | 1 | 0.6 | #keyHalo |
| key_direction | light | -1 | 1 | 0 | key layer |
| rim | light | 0 | 1 | 0.45 | #rim |
| pearl_intensity | material | 0 | 1 | 0.55 | #pearlCorePath |
| roughness | material | 0 | 1 | 0.35 | shell |
| clearcoat | material | 0 | 1 | 0.4 | specular |

Gate: visible controls == registry.ids() == serialize() keys
