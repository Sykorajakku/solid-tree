import { describe, expect, test } from '@jest/globals';
import { DataFactory, Parser } from 'n3';
import { RdfjsShaclPathExtractor } from '../../src/shacl/rdfjsShaclPathExtractor';
const { quad, namedNode, literal } = DataFactory;

describe('RDF/JS SHACL Path Extractor', () => {
    
    test('can extract values from LDES member using simple path property', async () => {

        const pathQuads = [ 
            quad(namedNode('https://tree.linkeddatafragments.org/data/addressregister/streetnames/'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('https://w3id.org/tree#SubstringRelation')),
            quad(namedNode('https://tree.linkeddatafragments.org/data/addressregister/streetnames/'), namedNode('https://w3id.org/tree#path'), namedNode('http://www.w3.org/2000/01/rdf-schema#label')),
         ];


        const pathExtractor = new RdfjsShaclPathExtractor(pathQuads);
        
        const values = pathExtractor.extractPathValue(
            [ 
                quad(namedNode('http://example.org/1'), namedNode('http://www.w3.org/2000/01/rdf-schema#label'), literal(42)),
                quad(namedNode('http://example.org/1'), namedNode('http://www.w3.org/2000/01/rdf-schema#label'), literal(11)),
                quad(namedNode('http://example.org/1'), namedNode('http://example.org/2'), literal(2)),
            ],
            namedNode('http://example.org/1')
        );

        expect(values.treeValues).toContain('11');
        expect(values.treeValues).toContain('42');
    });

    test('can extract values from LDES member using complex path property', async () => {
        const expectedExtractedValue = 'expected extracted value';
        
        const parser = new Parser();
        const quads = parser.parse(`
            @prefix ex: <https://example.org/example#> .
            @prefix tree: <https://w3id.org/tree#> .
            @prefix sh: <https://www.w3.org/ns/shacl#> .

            ex:1 tree:path ( ex:parent ex:firstName ) .
        `);

        const pathExtractor = new RdfjsShaclPathExtractor(quads);

        const memberRoot = namedNode('http://example.org/member/1');
        const memberParent = namedNode('http://example.org/member/2');

        const values = pathExtractor.extractPathValue(
            [ 
                quad(memberRoot, namedNode('https://example.org/example#parent'), memberParent),
                quad(memberParent, namedNode('https://example.org/example#firstName'), literal(expectedExtractedValue))
            ],
            memberRoot
        );

        expect(values.treeValues[0]).toBe(expectedExtractedValue);
    });
});
