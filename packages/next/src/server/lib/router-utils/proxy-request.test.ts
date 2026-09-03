import type { IncomingMessage } from 'http'
import { stripHopByHopRequestHeaders } from './proxy-request'

function fakeRequest(headers: Record<string, string>): IncomingMessage {
  return { headers } as IncomingMessage
}

describe('stripHopByHopRequestHeaders', () => {
  it('strips the RFC 9110 hop-by-hop set from plain HTTP requests', () => {
    const req = fakeRequest({
      host: 'example',
      connection: 'keep-alive',
      'keep-alive': 'timeout=5',
      te: 'trailers',
      trailer: 'x-checksum',
      'transfer-encoding': 'chunked',
      upgrade: 'websocket',
      'proxy-authorization': 'Basic abc',
      'proxy-connection': 'keep-alive',
    })
    stripHopByHopRequestHeaders(req, false)
    expect(req.headers).toEqual({ host: 'example' })
  })

  it('strips headers nominated by the Connection token list', () => {
    const req = fakeRequest({
      host: 'example',
      connection: 'x-internal-auth, keep-alive',
      'x-internal-auth': '1',
      'x-untouched': 'yes',
    })
    stripHopByHopRequestHeaders(req, false)
    expect(req.headers).toEqual({
      host: 'example',
      'x-untouched': 'yes',
    })
  })

  it('keeps the handshake pair but strips nominated extras when proxying upgrades', () => {
    const req = fakeRequest({
      host: 'example',
      connection: 'Upgrade, x-internal-auth',
      upgrade: 'websocket',
      'x-internal-auth': '1',
      'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'transfer-encoding': 'chunked',
    })
    stripHopByHopRequestHeaders(req, true)
    expect(req.headers).toEqual({
      host: 'example',
      connection: 'Upgrade, x-internal-auth',
      upgrade: 'websocket',
      'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
    })
  })

  it('tolerates an absent Connection header', () => {
    const req = fakeRequest({ host: 'example', connection: undefined as any })
    expect(() => stripHopByHopRequestHeaders(req, false)).not.toThrow()
    expect(req.headers).toEqual({ host: 'example', connection: undefined })
  })
})
