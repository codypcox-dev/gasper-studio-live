

(() => {
  'use strict'

  function finitePair(value, name) {
    if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite)) throw new TypeError(`${name} must be a finite pair`)
    return Object.freeze([value[0], value[1]])
  }

  function createFacePlane({ center, eyes, mouth, eyeWidth }) {
    if (!Array.isArray(eyes) || eyes.length !== 2) throw new TypeError('eyes must contain two anchors')
    if (!Number.isFinite(eyeWidth) || eyeWidth <= 0) throw new TypeError('eyeWidth must be positive')
    return Object.freeze({
      center: finitePair(center, 'center'),
      eyes: Object.freeze([finitePair(eyes[0], 'left eye'), finitePair(eyes[1], 'right eye')]),
      mouth: finitePair(mouth, 'mouth'),
      eyeWidth,
    })
  }

  function projectFacePlane(plane, view) {
    if (!plane?.center || !view || !Number.isFinite(view.yawDegrees) || !Number.isFinite(view.anchorShift) || !Number.isFinite(view.compression) || view.compression <= 0) throw new TypeError('view must contain finite yawDegrees, anchorShift, and positive compression')
    const offsets = view.offsets || {}
    const offsetFor = (key) => finitePair(offsets[key] || [0, 0], `${key} offset`)
    const project = (point, key) => {
      const offset = offsetFor(key)
      const x = point[0] + offset[0]
      const y = point[1] + offset[1]
      return { x: plane.center[0] + view.anchorShift + (x - plane.center[0]) * view.compression, y }
    }
    const left = project(plane.eyes[0], 'leftEye')
    const right = project(plane.eyes[1], 'rightEye')
    const mouth = project(plane.mouth, 'mouth')
    const width = plane.eyeWidth * view.compression
    return Object.freeze({
      leftEye: Object.freeze({ ...left, width }),
      rightEye: Object.freeze({ ...right, width }),
      mouth: Object.freeze(mouth),
      transform: Object.freeze({ yawDegrees: view.yawDegrees, anchorShift: view.anchorShift, compression: view.compression }),
    })
  }

  globalThis.SidekickFacePlane = Object.freeze({ createFacePlane, projectFacePlane })
})()


