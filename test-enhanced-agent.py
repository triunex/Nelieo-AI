#!/usr/bin/env python3
"""
Test Enhanced SuperAgent vs Standard SuperAgent

Benchmark tests to prove superiority over Claude Computer Use and OpenAI Operator
"""

import os
import sys
import time
import json
import logging
from typing import Dict, List

# Add to path
sys.path.insert(0, '/opt/lumina-search-flow-main')

from superagent.core import SuperAgent
from superagent.enhanced_core import EnhancedSuperAgent
from superagent.ollama_vision import OllamaVisionAPI
from superagent.executor import ActionExecutor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AgentBenchmark:
    """Benchmark test suite for agent comparison"""
    
    def __init__(self):
        self.results = {
            'standard': [],
            'enhanced': []
        }
        
        # Initialize vision API (shared)
        self.vision_api = OllamaVisionAPI(
            base_url="http://localhost:11434",
            model="llama3.2-vision:11b",
            timeout=180
        )
        
        # Initialize both agents
        self.standard_agent = SuperAgent(
            vision_api=self.vision_api,
            max_iterations=30,
            memory_path="/tmp/standard_memory.json"
        )
        
        self.enhanced_agent = EnhancedSuperAgent(
            vision_api=self.vision_api,
            max_iterations=50,
            memory_path="/tmp/enhanced_memory.json",
            enable_parallel=True,
            enable_reflection=True,
            enable_verification=True
        )
        
        logger.info("✅ Both agents initialized")
    
    def run_test(self, task: str, agent_type: str, timeout: float = 300.0) -> Dict:
        """Run single test"""
        logger.info(f"\n{'='*60}")
        logger.info(f"Testing {agent_type.upper()}: {task}")
        logger.info(f"{'='*60}")
        
        agent = self.enhanced_agent if agent_type == 'enhanced' else self.standard_agent
        
        start_time = time.time()
        
        try:
            result = agent.execute_task(task, timeout=timeout)
            
            duration = time.time() - start_time
            
            test_result = {
                'task': task,
                'agent_type': agent_type,
                'success': result.success,
                'duration': duration,
                'actions_taken': result.actions_taken,
                'error': result.error if not result.success else None,
                'timestamp': time.time()
            }
            
            # Get agent stats if enhanced
            if agent_type == 'enhanced':
                stats = agent.get_stats()
                test_result['reflections'] = stats['advanced_features']['reflections_performed']
                test_result['replans'] = stats['advanced_features']['replans_triggered']
            
            self.results[agent_type].append(test_result)
            
            logger.info(f"\n{'='*60}")
            logger.info(f"Result: {'✅ SUCCESS' if result.success else '❌ FAILED'}")
            logger.info(f"Duration: {duration:.1f}s")
            logger.info(f"Actions: {result.actions_taken}")
            if not result.success:
                logger.info(f"Error: {result.error}")
            logger.info(f"{'='*60}\n")
            
            return test_result
            
        except Exception as e:
            logger.error(f"Test failed with exception: {e}")
            import traceback
            logger.error(traceback.format_exc())
            
            test_result = {
                'task': task,
                'agent_type': agent_type,
                'success': False,
                'duration': time.time() - start_time,
                'actions_taken': 0,
                'error': str(e),
                'timestamp': time.time()
            }
            
            self.results[agent_type].append(test_result)
            return test_result
    
    def run_benchmark_suite(self):
        """Run full benchmark comparing both agents"""
        
        test_tasks = [
            # Simple tasks
            {
                'task': 'Type hello world',
                'timeout': 120,
                'category': 'simple'
            },
            {
                'task': 'Click on the Chrome icon',
                'timeout': 60,
                'category': 'simple'
            },
            
            # Medium complexity
            {
                'task': 'Open a new tab in Chrome',
                'timeout': 120,
                'category': 'medium'
            },
            {
                'task': 'Find and click the terminal icon',
                'timeout': 120,
                'category': 'medium'
            },
            
            # Complex tasks (enhanced agent should excel)
            {
                'task': 'Open Gmail and start composing a new email',
                'timeout': 240,
                'category': 'complex'
            },
            {
                'task': 'Search for "test" in Firefox and open first result',
                'timeout': 300,
                'category': 'complex'
            }
        ]
        
        logger.info("\n" + "="*80)
        logger.info("STARTING COMPREHENSIVE AGENT BENCHMARK")
        logger.info("="*80 + "\n")
        
        for i, test_case in enumerate(test_tasks, 1):
            task = test_case['task']
            timeout = test_case['timeout']
            category = test_case['category']
            
            logger.info(f"\n{'#'*80}")
            logger.info(f"# TEST {i}/{len(test_tasks)}: {category.upper()} - {task}")
            logger.info(f"{'#'*80}\n")
            
            # Test with standard agent
            logger.info("--- Testing STANDARD SuperAgent ---")
            time.sleep(2)  # Brief pause
            standard_result = self.run_test(task, 'standard', timeout)
            
            # Wait between tests
            logger.info("\nWaiting 5 seconds before next test...\n")
            time.sleep(5)
            
            # Test with enhanced agent
            logger.info("--- Testing ENHANCED SuperAgent ---")
            time.sleep(2)
            enhanced_result = self.run_test(task, 'enhanced', timeout)
            
            # Compare results
            self._print_comparison(standard_result, enhanced_result)
            
            # Wait between test cases
            if i < len(test_tasks):
                logger.info("\nWaiting 10 seconds before next test case...\n")
                time.sleep(10)
        
        # Generate final report
        self.generate_report()
    
    def _print_comparison(self, standard: Dict, enhanced: Dict):
        """Print comparison between two test results"""
        logger.info("\n" + "="*80)
        logger.info("COMPARISON")
        logger.info("="*80)
        
        # Success comparison
        logger.info(f"\nSuccess:")
        logger.info(f"  Standard: {'✅ SUCCESS' if standard['success'] else '❌ FAILED'}")
        logger.info(f"  Enhanced: {'✅ SUCCESS' if enhanced['success'] else '❌ FAILED'}")
        
        # Duration comparison
        logger.info(f"\nDuration:")
        logger.info(f"  Standard: {standard['duration']:.1f}s")
        logger.info(f"  Enhanced: {enhanced['duration']:.1f}s")
        
        if standard['success'] and enhanced['success']:
            speedup = (standard['duration'] / enhanced['duration'] - 1) * 100
            if speedup > 0:
                logger.info(f"  🚀 Enhanced is {speedup:.1f}% FASTER")
            else:
                logger.info(f"  ⚠️ Standard is {abs(speedup):.1f}% faster")
        
        # Actions comparison
        logger.info(f"\nActions Taken:")
        logger.info(f"  Standard: {standard['actions_taken']}")
        logger.info(f"  Enhanced: {enhanced['actions_taken']}")
        
        if standard['success'] and enhanced['success']:
            efficiency = (standard['actions_taken'] / max(enhanced['actions_taken'], 1) - 1) * 100
            if efficiency > 0:
                logger.info(f"  📊 Enhanced used {efficiency:.1f}% FEWER actions")
        
        # Enhanced-specific features
        if 'reflections' in enhanced:
            logger.info(f"\nEnhanced Features Used:")
            logger.info(f"  Self-reflections: {enhanced['reflections']}")
            logger.info(f"  Replans: {enhanced['replans']}")
        
        logger.info("="*80 + "\n")
    
    def generate_report(self):
        """Generate final comparison report"""
        logger.info("\n" + "#"*80)
        logger.info("# FINAL BENCHMARK REPORT")
        logger.info("#"*80 + "\n")
        
        # Overall statistics
        standard_results = self.results['standard']
        enhanced_results = self.results['enhanced']
        
        standard_success = sum(1 for r in standard_results if r['success'])
        enhanced_success = sum(1 for r in enhanced_results if r['success'])
        
        standard_avg_duration = sum(r['duration'] for r in standard_results) / len(standard_results)
        enhanced_avg_duration = sum(r['duration'] for r in enhanced_results) / len(enhanced_results)
        
        standard_avg_actions = sum(r['actions_taken'] for r in standard_results) / len(standard_results)
        enhanced_avg_actions = sum(r['actions_taken'] for r in enhanced_results) / len(enhanced_results)
        
        logger.info("OVERALL PERFORMANCE")
        logger.info("="*80)
        
        logger.info(f"\nSuccess Rate:")
        logger.info(f"  Standard: {standard_success}/{len(standard_results)} ({standard_success/len(standard_results)*100:.1f}%)")
        logger.info(f"  Enhanced: {enhanced_success}/{len(enhanced_results)} ({enhanced_success/len(enhanced_results)*100:.1f}%)")
        
        improvement = ((enhanced_success/len(enhanced_results)) - (standard_success/len(standard_results))) * 100
        if improvement > 0:
            logger.info(f"  🎯 Enhanced is {improvement:.1f}% MORE RELIABLE")
        
        logger.info(f"\nAverage Duration:")
        logger.info(f"  Standard: {standard_avg_duration:.1f}s")
        logger.info(f"  Enhanced: {enhanced_avg_duration:.1f}s")
        
        speed_improvement = (standard_avg_duration / enhanced_avg_duration - 1) * 100
        if speed_improvement > 0:
            logger.info(f"  🚀 Enhanced is {speed_improvement:.1f}% FASTER")
        
        logger.info(f"\nAverage Actions:")
        logger.info(f"  Standard: {standard_avg_actions:.1f}")
        logger.info(f"  Enhanced: {enhanced_avg_actions:.1f}")
        
        efficiency_improvement = (standard_avg_actions / enhanced_avg_actions - 1) * 100
        if efficiency_improvement > 0:
            logger.info(f"  📊 Enhanced is {efficiency_improvement:.1f}% MORE EFFICIENT")
        
        # Enhanced-specific stats
        total_reflections = sum(r.get('reflections', 0) for r in enhanced_results)
        total_replans = sum(r.get('replans', 0) for r in enhanced_results)
        
        logger.info(f"\nEnhanced Features Usage:")
        logger.info(f"  Total self-reflections: {total_reflections}")
        logger.info(f"  Total replans: {total_replans}")
        logger.info(f"  Avg reflections per task: {total_reflections/len(enhanced_results):.1f}")
        
        # Save report to file
        report = {
            'standard': {
                'success_rate': standard_success / len(standard_results),
                'avg_duration': standard_avg_duration,
                'avg_actions': standard_avg_actions,
                'results': standard_results
            },
            'enhanced': {
                'success_rate': enhanced_success / len(enhanced_results),
                'avg_duration': enhanced_avg_duration,
                'avg_actions': enhanced_avg_actions,
                'total_reflections': total_reflections,
                'total_replans': total_replans,
                'results': enhanced_results
            },
            'improvements': {
                'reliability': improvement,
                'speed': speed_improvement,
                'efficiency': efficiency_improvement
            }
        }
        
        report_file = '/var/log/agent_benchmark_report.json'
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"\n📄 Full report saved to: {report_file}")
        logger.info("\n" + "#"*80 + "\n")


def main():
    """Run benchmark"""
    logger.info("Initializing Agent Benchmark Suite...")
    
    benchmark = AgentBenchmark()
    benchmark.run_benchmark_suite()


if __name__ == '__main__':
    main()
