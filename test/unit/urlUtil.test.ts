import { describe, expect, test } from '@jest/globals';
import { parseSolidContainerUrl  } from '../../src/util/url';

describe('URL Util', () => {
    
    describe('can detect URL string', () => {
        
        test('is valid URL of container', async () => {
            const expectedURI = 'https://solid.org/container/'
            const resultURI = parseSolidContainerUrl(expectedURI)
            expect(resultURI.href).toBe(expectedURI)
        })
    
        test('is not container URL as it needs to contain "/" at the end', async () => {
            const test = () => {
                parseSolidContainerUrl('https://solid.org/page')
            }
            expect(test).toThrow(Error)
        })
    
        test('is not container URL as it contains "#" fragment', async () => {
            const test = () => {
                parseSolidContainerUrl('https://solid.org/page#abcd')
            }
            expect(test).toThrow(Error)
        })
    
        test('is not valid URL', async () => {
            const test = () => {
                parseSolidContainerUrl('https://solid.org/page')
            }
            expect(test).toThrow(Error)
        })
    })
})
