// Types
import { Header } from '@polkadot/types/interfaces';
import { QueryParams, Proof, Leaf, VerifyProof } from './types';

import { ApiPromise, WsProvider } from '@polkadot/api';
import { MerkleTree } from 'merkletreejs';
import SHA256 from 'crypto-js/sha256';
import store  from 'store';


const provider = new WsProvider('wss://rpc.polkadot.io');

(async (): Promise<any> => {
  
  // Initialize Polkadot API
  const api = await ApiPromise.create({ provider });

  // Merkle tree collection
  let leaves: Header[] = [];
  const trees: unknown[] = [];
  
  // Define batch size and header count
  let headerCount: number = 0;
  const batchSize: number = 2;
  const treesLimit: number = 4;

  //Subscribe for new headers
  const chain = await api.rpc.system.chain();
  const unsubscribe = await api.rpc.chain.subscribeNewHeads(async (header: Header) => {
    console.log(`${chain}: last block #${header.number} has hash ${header.hash}`);
    leaves.push(header);
    // create and write to Merkle tree when batch size limit has been reached (1)
    if (++headerCount === batchSize) {
      createAndWriteToMerkleTree();
      resetHeader();

      // Query the first header of each tree by number or hash (3)
      const queribleHeader = await queryHeaderByNumberOrHash({ blockNumber: header.number });
      console.log('The header has been found: ', queribleHeader.toHuman());
      console.log('Store updated, new store: ', getMerkleTreesFromStore());
    }
    // Unsubscribe when reached trees limit
    if (trees.length === treesLimit) {
      unsubscribe();
      console.log('Merkle trees from the store: ',
      getMerkleTreesFromStore());
    }
  });

  function createAndWriteToMerkleTree() {
    // Hash leaves and initialize the Merkle tree
    const hashedLeaves = leaves.map((leaf: Header) => SHA256(leaf.toString()));
    const tree = new MerkleTree(hashedLeaves, SHA256);
    const root: string = tree.getRoot().toString('hex')

    // Get proofs and verify 
    const proofs = getMerkleProofs(tree, hashedLeaves, root);

    // Check if all proofs have truthy value, if yes - store the tree (2)
    if (proofs.every((proof: boolean): boolean => proof)) {
      trees.push(tree);
      store.set('merkletrees', trees);
    } else {
      console.log('Bad leaves detected in ', tree);
    }
  }

  // function that generates the Merkle inclusion proof for each stored header (4)
  function getMerkleProofs<T extends VerifyProof>(tree: T, hashedLeaves: Leaf[] | any, root: string) {
    return hashedLeaves.map((leaf: Leaf): boolean => {
      const proof: Proof = tree.getProof(leaf);
      // Verify every leaf
      return verifyMerkleTree(tree, proof, leaf, root)
    });
  }

  // function for verifying the generated proofs (5)
  function verifyMerkleTree<T extends VerifyProof>(tree: T, proof: Proof, leaf: Leaf, root: string) {
    return tree.verify(proof, leaf, root);
  }

  function resetHeader(): void {
    headerCount = 0;
    leaves = [];
  }

  function getMerkleTreesFromStore(): string {
    return store.get('merkletrees');
  }

  async function queryHeaderByNumberOrHash({ blockNumber, hash }: QueryParams) {
    if (!hash) {
      console.log(`Getting the block hash for the block #${blockNumber}...`);
      hash = await api.rpc.chain.getBlockHash(blockNumber);
    }
    console.log(`Retrieving the header for the hash ${hash}...`);
    return await api.rpc.chain.getHeader(hash);
  }
})();
