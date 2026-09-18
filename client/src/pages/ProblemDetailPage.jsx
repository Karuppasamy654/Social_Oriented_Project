import React from 'react';
import { useParams } from 'react-router-dom';
import FuturisticCyberWorkspace from '../components/workspace/FuturisticCyberWorkspace';

export default function ProblemDetailPage() {
  const { slug } = useParams();
  return <FuturisticCyberWorkspace problemSlugOrId={slug} />;
}
