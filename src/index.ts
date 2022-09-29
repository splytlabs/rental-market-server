import 'reflect-metadata';
import 'dotenv/config';

import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from 'ethers';
import { readFileSync } from 'fs';
import { Pool } from 'pg';
import { DbService } from './services/db';
import { QueryBuilder } from './services/query';

const contractRawData = readFileSync('./src/market.json').toString();

const abi = JSON.parse(contractRawData).abi;

const provider = new JsonRpcProvider(process.env.KLAYTN_RPC_URL);

const MARKET_CONTRACT_ADDRESS = '0x0997d2d5cE4bA4036B396fd1b2cceFbF4BeA8Ec2';
const contract = new Contract(MARKET_CONTRACT_ADDRESS, abi, provider);

const pool = new Pool({
  host: 'db.ltfdhwvztsqsskvggemu.supabase.co',
  database: 'postgres',
  port: 5432,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PW ?? '',
  max: 5,
});

const db = new DbService(pool);

type CreateLendOrderEvent = {
  id: bigint;
  owner: string;
  tokenId: bigint;
  paymentOption: string;
  payment: bigint;
  paymentTokenAddress: string;
  validUntil: bigint;
  minRentDuration: bigint;
  maxRentDuration: bigint;
  txStatus: string;
  txHash: string;
  collection_id: number;
};

contract.on(
  'CreateLendOrder',
  async (
    lendId,
    owner,
    nftAddress,
    tokenId,
    minRentDuration,
    maxRentDuration,
    payment,
    paymentTokenAddress,
    event,
  ) => {
    const args: CreateLendOrderEvent = {
      id: lendId,
      owner,
      tokenId,
      minRentDuration,
      maxRentDuration,
      payment,
      paymentTokenAddress,
      paymentOption: 'Share',
      collection_id: 1,
      txStatus: 'Confirmed',
      txHash: event.transactionHash,
      validUntil: BigInt(1666598400),
    };

    const query = QueryBuilder.buildInsertQuery('lends', args);
    console.log('query', query);

    await db.run(query);
  },
);

type FulfillOrderEvent = {
  id: bigint;
  renter: string;
  startAt: bigint;
  endAt: bigint;
  txStatus: string;
  txHash: string;
  lendId: bigint;
};

contract.on(
  'FulfillOrder',
  async (
    rentId,
    lendId,
    renter,
    lender,
    nftAddress,
    nftId,
    startAt,
    endAt,
    shareRatio,
    paymentToken,
    event,
  ) => {
    const args: FulfillOrderEvent = {
      id: rentId,
      renter,
      startAt,
      endAt,
      txStatus: 'Confirmed',
      txHash: event.transactionHash,
      lendId: lendId,
    };

    const query = QueryBuilder.buildInsertQuery('rents', args);
    console.log('query', query);

    await db.run(query);
  },
);