import type { Comparison } from './types';

// The 5 daily comparisons for World Price Clash.
// Relatable, everyday global items everyone knows — coffee, streaming, sneakers,
// fast food, gaming, rideshares, cinema, and city bikes.
// Prices are in USD.

export const COMPARISON_POOL: Comparison[] = [
  {
    id: 'r1',
    a: { emoji: '☕', name: 'Starbucks Caffe Latte (Large)', country: 'Switzerland', countryCode: 'CH', price: 8.50, unit: 'in Zurich', fact: 'A single morning coffee in Switzerland costs more than an entire month of 4K Netflix streaming in India!' },
    b: { emoji: '🎬', name: '1 Month of Netflix Premium Plan', country: 'India', countryCode: 'IN', price: 7.90, unit: 'per month', fact: 'A single morning coffee in Switzerland costs more than an entire month of 4K Netflix streaming in India!' },
  },
  {
    id: 'r2',
    a: { emoji: '⛽', name: 'Full tank of petrol (50L)', country: 'Norway', countryCode: 'NO', price: 110.00, unit: 'per fill-up', fact: 'Filling up your car just once in Norway costs almost as much as buying a brand new pair of classic Nikes in the US.' },
    b: { emoji: '👟', name: 'Pair of Nike Air Force 1 Sneakers', country: 'USA', countryCode: 'US', price: 115.00, unit: 'per pair', fact: 'Filling up your car just once in Norway costs almost as much as buying a brand new pair of classic Nikes in the US.' },
  },
  {
    id: 'r3',
    a: { emoji: '🍔', name: "Big Mac Extra Value Meal at McDonald's", country: 'Japan', countryCode: 'JP', price: 5.20, unit: 'in Tokyo', fact: 'A single pint of beer in London costs significantly more than a full burger meal with fries and a drink in Tokyo!' },
    b: { emoji: '🍺', name: '1 Pint of Draught Beer at a pub', country: 'UK', countryCode: 'GB', price: 8.20, unit: 'in London', fact: 'A single pint of beer in London costs significantly more than a full burger meal with fries and a drink in Tokyo!' },
  },
  {
    id: 'r4',
    a: { emoji: '🎮', name: 'Sony PlayStation 5 Console', country: 'USA', countryCode: 'US', price: 499.00, unit: 'per console', fact: 'For the price of one gaming console, you could ride Uber across Cairo for hundreds of kilometers.' },
    b: { emoji: '🚗', name: '100 km of Uber rides', country: 'Egypt', countryCode: 'EG', price: 350.00, unit: 'in Cairo', fact: 'For the price of one gaming console, you could ride Uber across Cairo for hundreds of kilometers.' },
  },
  {
    id: 'r5',
    a: { emoji: '🎟️', name: 'Single IMAX Cinema Ticket', country: 'USA', countryCode: 'US', price: 28.00, unit: 'in New York City', fact: 'A single movie night in NYC costs almost the same as unlimited bike rides around Paris for a whole month.' },
    b: { emoji: '🚲', name: 'Monthly pass for Vélib shared city bikes', country: 'France', countryCode: 'FR', price: 31.00, unit: 'per month in Paris', fact: 'A single movie night in NYC costs almost the same as unlimited bike rides around Paris for a whole month.' },
  },
];
