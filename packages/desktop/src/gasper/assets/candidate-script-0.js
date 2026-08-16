

(() => {
  'use strict'

  function requireInteger(value, minimum, name) {
    if (!Number.isInteger(value) || value < minimum) throw new TypeError(`${name} must be an integer >= ${minimum}`)
  }

  function createPolarTopology({ rings, sectors }) {
    requireInteger(rings, 2, 'rings')
    requireInteger(sectors, 3, 'sectors')
    const vertices = []
    for (let ring = 0; ring < rings; ring += 1) {
      const radial = (ring + 0.72) / rings
      const stagger = (ring % 2) * Math.PI / sectors
      for (let sector = 0; sector < sectors; sector += 1) {
        vertices.push(Object.freeze({
          index: ring * sectors + sector,
          ring,
          sector,
          radial,
          theta: -Math.PI / 2 + sector * 2 * Math.PI / sectors + stagger,
          u: sector / sectors,
          v: radial,
        }))
      }
    }
    const triangles = []
    for (let ring = 0; ring < rings - 1; ring += 1) {
      for (let sector = 0; sector < sectors; sector += 1) {
        const next = (sector + 1) % sectors
        const a = ring * sectors + sector
        const b = ring * sectors + next
        const c = (ring + 1) * sectors + sector
        const d = (ring + 1) * sectors + next
        const pair = ring % 2 === 0 ? [[a, c, d], [a, d, b]] : [[a, c, b], [b, c, d]]
        triangles.push(Object.freeze(pair[0]), Object.freeze(pair[1]))
      }
    }
    return Object.freeze({ rings, sectors, vertices: Object.freeze(vertices), triangles: Object.freeze(triangles) })
  }

  function createContourSamples({ samples, radiusAt, cx = 120, cy = 110, sx = 1, sy = 1 }) {
    requireInteger(samples, 3, 'samples')
    if (typeof radiusAt !== 'function') throw new TypeError('radiusAt must be a function')
    const contour = Array.from({ length: samples }, (_, index) => {
      const theta = -Math.PI / 2 + index * 2 * Math.PI / samples
      const radius = radiusAt(theta)
      if (!Number.isFinite(radius)) throw new TypeError('radiusAt must return finite values')
      return Object.freeze({ index, theta, radius, x: cx + Math.cos(theta) * radius * sx, y: cy + Math.sin(theta) * radius * sy })
    })
    return Object.freeze(contour)
  }

  function sampleField(topology, evaluator) {
    if (!topology?.vertices || typeof evaluator !== 'function') throw new TypeError('topology and evaluator are required')
    return topology.vertices.map((vertex) => evaluator(vertex.u, vertex.v, vertex.theta, vertex))
  }

  globalThis.SidekickAdaptiveMesh = Object.freeze({ createPolarTopology, createContourSamples, sampleField })
})()


