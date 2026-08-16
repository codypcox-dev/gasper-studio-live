

(() => {
  'use strict'

  const RELIEF_KINDS = Object.freeze([
    'brow_raise',
    'brow_knit',
    'cheek_dimple',
    'effort_pinches',
    'goosebumps',
  ])

  const KIND_SET = new Set(RELIEF_KINDS)

  function wrappedDistance(a, b) {
    const distance = Math.abs(a - b) % 1
    return Math.min(distance, 1 - distance)
  }

  function requireFinite(value, name) {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`)
    return value
  }

  function validatePrimitive(primitive) {
    if (!primitive || !KIND_SET.has(primitive.kind)) throw new TypeError('unknown relief kind')
    requireFinite(primitive.u, 'u')
    requireFinite(primitive.v, 'v')
    requireFinite(primitive.amplitude, 'amplitude')
    requireFinite(primitive.radius, 'radius')
    if (primitive.radius <= 0) throw new TypeError('radius must be positive')
  }

  function kernelAt(vertex, primitive, scaleU = 1, scaleV = 1) {
    const du = wrappedDistance(vertex.u, primitive.u) / (primitive.radius * scaleU)
    const dv = (vertex.v - primitive.v) / (primitive.radius * scaleV)
    return Math.exp(-0.5 * (du * du + dv * dv))
  }

  function hashNoise(seed, index) {
    let value = (Math.trunc(seed) ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0
    return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff
  }

  function samplePrimitive(vertex, primitive, seed) {
    switch (primitive.kind) {
      case 'brow_raise':
        return primitive.amplitude * kernelAt(vertex, primitive, 1.45, 0.58)
      case 'brow_knit': {
        const crest = kernelAt(vertex, primitive, 0.68, 1.15)
        const innerFold = kernelAt(vertex, { ...primitive, v: primitive.v + primitive.radius * 0.42 }, 0.42, 0.7)
        return primitive.amplitude * (crest - innerFold * 0.72)
      }
      case 'cheek_dimple':
        return primitive.amplitude * kernelAt(vertex, primitive, 0.72, 0.66)
      case 'effort_pinches': {
        const offset = primitive.radius * 0.46
        const left = kernelAt(vertex, { ...primitive, u: primitive.u - offset }, 0.44, 0.76)
        const right = kernelAt(vertex, { ...primitive, u: primitive.u + offset }, 0.44, 0.76)
        const centerRelease = kernelAt(vertex, primitive, 0.52, 0.82)
        return primitive.amplitude * (left + right - centerRelease * 0.62)
      }
      case 'goosebumps': {
        const envelope = kernelAt(vertex, primitive, 1.1, 1.0)
        const noise = hashNoise(seed, vertex.index) * 2 - 1
        const cellular = Math.sin((vertex.sector + seed * 0.17) * 2.399963) * 0.35 + noise * 0.65
        return primitive.amplitude * envelope * cellular
      }
      default:
        return 0
    }
  }

  function evaluateRelief(topology, primitives, seed = 0) {
    if (!topology?.vertices || !Array.isArray(primitives)) throw new TypeError('topology and primitives are required')
    requireFinite(seed, 'seed')
    primitives.forEach(validatePrimitive)
    const heights = new Float64Array(topology.vertices.length)
    for (const vertex of topology.vertices) {
      let height = 0
      for (const primitive of primitives) height += samplePrimitive(vertex, primitive, seed)
      heights[vertex.index] = height
    }
    return heights
  }

  function deriveNormals(topology, heights) {
    if (!topology?.vertices || !Number.isInteger(topology.rings) || !Number.isInteger(topology.sectors)) throw new TypeError('polar topology is required')
    if (!heights || heights.length !== topology.vertices.length) throw new TypeError('one height per vertex is required')
    const { rings, sectors } = topology
    const at = (ring, sector) => heights[Math.max(0, Math.min(rings - 1, ring)) * sectors + ((sector % sectors) + sectors) % sectors]
    return topology.vertices.map((vertex) => {
      const du = (at(vertex.ring, vertex.sector + 1) - at(vertex.ring, vertex.sector - 1)) * 0.5
      const dv = (at(vertex.ring + 1, vertex.sector) - at(vertex.ring - 1, vertex.sector)) * 0.5
      const x = -du
      const y = -dv
      const z = 1
      const length = Math.hypot(x, y, z)
      return Object.freeze({ x: x / length, y: y / length, z: z / length })
    })
  }

  globalThis.SidekickReliefFields = Object.freeze({
    RELIEF_KINDS,
    wrappedDistance,
    evaluateRelief,
    deriveNormals,
  })
})()


