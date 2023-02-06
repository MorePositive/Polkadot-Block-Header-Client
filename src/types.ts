import { BlockHash, BlockNumber } from '@polkadot/types/interfaces';

export interface IHeader {
  number: number;
  hash: string;
}

export interface ILeaf {
  words: number[];
  sigBytes: number;
}

export interface IProof {
  position: 'left' | 'right';
  data: Buffer;
}

export interface IMerkleTree {
  getRoot: () => Buffer;
  getProof: () => GetProof;
  verify: Verify;
}

export type Leaf = Buffer | string;

export type GetProof = (leaf: Buffer | string, index?: number) => Proof;

export type Verify = (proof: any[], leaf: Buffer | string, root: Buffer | string) => boolean;

export type VerifyProof = { getProof: GetProof, verify: Verify};

export type Proof = IProof[];

export type HashedLeaves = ILeaf[];

export type QueryParams = { blockNumber: BlockNumber | any, hash?: BlockHash };
