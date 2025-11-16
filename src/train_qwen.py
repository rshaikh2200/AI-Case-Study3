#!/usr/bin/env python3
"""
Training script for Qwen/Qwen3-30B-A3B-Instruct-2507 using Tinker API
Trains on output.json file containing Japanese medical case studies
"""

import os
import json
import numpy as np
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv
import tinker
from tinker import types

# Load environment variables from .env file
load_dotenv()


def load_training_data(json_path: str) -> List[Dict]:
    """Load training examples from JSON file."""
    print(f"Loading training data from {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"Loaded {len(data)} training examples")
    return data


def process_example(example: Dict, tokenizer) -> types.Datum:
    """
    Convert a training example into the format expected by Tinker.
    
    Args:
        example: Dictionary with 'input' and 'output' keys
        tokenizer: Tokenizer from the training client
    
    Returns:
        A Datum object ready for training
    """
    # Format the prompt - you can customize this based on your needs
    # For instruction-following models, you might want to use a chat template
    prompt = example['input']
    
    # Encode the prompt with special tokens
    prompt_tokens = tokenizer.encode(prompt, add_special_tokens=True)
    prompt_weights = [0] * len(prompt_tokens)
    
    # Encode the completion (output) - add space before and newlines after
    # Adjust this based on your model's expected format
    completion_text = f" {example['output']}\n\n"
    completion_tokens = tokenizer.encode(completion_text, add_special_tokens=False)
    completion_weights = [1] * len(completion_tokens)
    
    # Combine prompt and completion
    tokens = prompt_tokens + completion_tokens
    weights = prompt_weights + completion_weights
    
    # For next-token prediction, shift tokens by one position
    input_tokens = tokens[:-1]
    target_tokens = tokens[1:]
    weights = weights[1:]
    
    # Create and return the Datum
    return types.Datum(
        model_input=types.ModelInput.from_ints(tokens=input_tokens),
        loss_fn_inputs=dict(weights=weights, target_tokens=target_tokens)
    )


def visualize_example(datum: types.Datum, tokenizer, num_tokens: int = 20):
    """Visualize a training example for debugging."""
    print(f"\n{'Input':<30} {'Target':<30} {'Weight':<10}")
    print("-" * 70)
    
    input_ints = datum.model_input.to_ints()
    target_ints = datum.loss_fn_inputs['target_tokens'].tolist()
    weights = datum.loss_fn_inputs['weights'].tolist()
    
    for i, (inp, tgt, wgt) in enumerate(zip(input_ints[:num_tokens], 
                                             target_ints[:num_tokens], 
                                             weights[:num_tokens])):
        inp_str = repr(tokenizer.decode([inp]))
        tgt_str = repr(tokenizer.decode([tgt]))
        print(f"{inp_str:<30} {tgt_str:<30} {wgt:<10}")


def train_model(
    json_path: str,
    base_model: str = "Qwen/Qwen3-30B-A3B-Instruct-2507",
    batch_size: int = 24,
    num_epochs: int = 2,
    learning_rate: float = 5e-4,
    max_examples: int = None,
    visualize_first_example: bool = True
):
    """
    Train the model on the provided JSON data.
    
    Default parameters are optimized for ~93,563 training examples:
    - batch_size=24: Larger batch for stability with large dataset
    - num_epochs=2: Balanced training while maintaining generalization
    - learning_rate=5e-4: Conservative LR for fine-tuning large datasets
    
    Args:
        json_path: Path to the JSON file with training data
        base_model: Base model name to fine-tune
        batch_size: Number of examples per batch (default: 24, optimized)
        num_epochs: Number of training epochs (default: 2, optimized)
        learning_rate: Learning rate for Adam optimizer (default: 5e-4, optimized)
        max_examples: Maximum number of examples to use (None for all)
        visualize_first_example: Whether to visualize the first example
    """
    # Check for API key
    api_key = os.getenv("TINKER_API_KEY")
    if not api_key:
        raise ValueError(
            "TINKER_API_KEY not found. Please set it in a .env file in the same directory as this script.\n"
            "Create a .env file with: TINKER_API_KEY=your_api_key_here"
        )
    
    # Load training data
    training_data = load_training_data(json_path)
    
    # Limit examples if specified
    if max_examples:
        training_data = training_data[:max_examples]
        print(f"Using {len(training_data)} examples (limited from total)")
    
    # Create service client and check available models
    print("\nConnecting to Tinker API...")
    service_client = tinker.ServiceClient()
    
    print("\nAvailable models:")
    for item in service_client.get_server_capabilities().supported_models:
        print(f"  - {item.model_name}")
    
    # Create training client
    print(f"\nCreating training client for base model: {base_model}")
    training_client = service_client.create_lora_training_client(
        base_model=base_model
    )
    
    # Get tokenizer
    tokenizer = training_client.get_tokenizer()
    print("Tokenizer loaded successfully")
    
    # Process all examples
    print(f"\nProcessing {len(training_data)} training examples...")
    processed_examples = []
    for i, example in enumerate(training_data):
        try:
            datum = process_example(example, tokenizer)
            processed_examples.append(datum)
            if (i + 1) % 1000 == 0:
                print(f"  Processed {i + 1}/{len(training_data)} examples...")
        except Exception as e:
            print(f"  Warning: Failed to process example {i}: {e}")
            continue
    
    print(f"Successfully processed {len(processed_examples)} examples")
    
    # Visualize first example if requested
    if visualize_first_example and processed_examples:
        print("\n" + "="*70)
        print("Visualizing first training example:")
        print("="*70)
        visualize_example(processed_examples[0], tokenizer)
    
    # Training loop
    print(f"\n{'='*70}")
    print(f"Starting training: {num_epochs} epoch(s), batch size: {batch_size}")
    print(f"{'='*70}\n")
    
    # Split into batches
    num_batches = (len(processed_examples) + batch_size - 1) // batch_size
    
    for epoch in range(num_epochs):
        print(f"\nEpoch {epoch + 1}/{num_epochs}")
        print("-" * 70)
        
        epoch_losses = []
        
        # Process in batches
        for batch_idx in range(num_batches):
            start_idx = batch_idx * batch_size
            end_idx = min(start_idx + batch_size, len(processed_examples))
            batch = processed_examples[start_idx:end_idx]
            
            # Perform forward-backward pass
            fwdbwd_future = training_client.forward_backward(
                batch, 
                "cross_entropy"
            )
            
            # Perform optimization step
            optim_future = training_client.optim_step(
                types.AdamParams(learning_rate=learning_rate)
            )
            
            # Wait for results
            fwdbwd_result = fwdbwd_future.result()
            optim_result = optim_future.result()
            
            # Calculate loss
            logprobs = np.concatenate([
                output['logprobs'].tolist() 
                for output in fwdbwd_result.loss_fn_outputs
            ])
            weights = np.concatenate([
                example.loss_fn_inputs['weights'].tolist() 
                for example in batch
            ])
            
            if weights.sum() > 0:
                loss = -np.dot(logprobs, weights) / weights.sum()
                epoch_losses.append(loss)
                
                if (batch_idx + 1) % 10 == 0 or batch_idx == 0:
                    print(f"  Batch {batch_idx + 1}/{num_batches}: "
                          f"Loss = {loss:.4f}")
        
        # Print epoch summary
        if epoch_losses:
            avg_loss = np.mean(epoch_losses)
            print(f"\nEpoch {epoch + 1} average loss: {avg_loss:.4f}")
    
    print(f"\n{'='*70}")
    print("Training completed!")
    print(f"{'='*70}\n")
    
    # Save weights and get sampling client
    print("Saving model weights...")
    model_name = f"japanese-medical-cases-{base_model.replace('/', '-')}"
    sampling_client = training_client.save_weights_and_get_sampling_client(
        name=model_name
    )
    print(f"Model saved as: {model_name}")
    
    return training_client, sampling_client, tokenizer

    print("sampling client:", sampling_client)
    print("training client:", training_client)
    print("tokenizer:", tokenizer)


def sample_from_model(
    sampling_client,
    tokenizer,
    prompt: str,
    max_tokens: int = 200,
    temperature: float = 0.7,
    num_samples: int = 4
):
    """
    Sample from the trained model.
    
    Args:
        sampling_client: Sampling client from training
        tokenizer: Tokenizer
        prompt: Input prompt text
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature
        num_samples: Number of samples to generate
    """
    print(f"\nSampling from model with prompt:")
    print(f"  {prompt}")
    print(f"\nGenerating {num_samples} samples...")
    
    # Encode prompt
    prompt_input = types.ModelInput.from_ints(
        tokenizer.encode(prompt, add_special_tokens=True)
    )
    
    # Set sampling parameters
    sampling_params = types.SamplingParams(
        max_tokens=max_tokens,
        temperature=temperature,
        stop=["\n\n"]  # Stop on double newline
    )
    
    # Sample
    future = sampling_client.sample(
        prompt=prompt_input,
        sampling_params=sampling_params,
        num_samples=num_samples
    )
    result = future.result()
    
    # Print results
    print("\nGenerated samples:")
    print("-" * 70)
    for i, seq in enumerate(result.sequences):
        decoded = tokenizer.decode(seq.tokens)
        print(f"\nSample {i + 1}:")
        print(f"  {decoded}")
    
    return result


def main():
    """Main function to run training."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Train Qwen model on Japanese medical case studies"
    )
    parser.add_argument(
        "--json-path",
        type=str,
        default="output.json",
        help="Path to JSON training data file"
    )
    parser.add_argument(
        "--base-model",
        type=str,
        default="Qwen/Qwen3-30B-A3B-Instruct-2507",
        help="Base model name to fine-tune"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=24,
        help="Batch size for training (optimized for ~93K examples)"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=2,
        help="Number of training epochs (optimized for ~93K examples)"
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=5e-4,
        help="Learning rate for Adam optimizer (optimized for fine-tuning)"
    )
    parser.add_argument(
        "--max-examples",
        type=int,
        default=None,
        help="Maximum number of examples to use (for testing)"
    )
    parser.add_argument(
        "--no-visualize",
        action="store_true",
        help="Skip visualizing the first example"
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Generate samples after training"
    )
    parser.add_argument(
        "--sample-prompt",
        type=str,
        default=None,
        help="Custom prompt for sampling (uses default if not provided)"
    )
    
    args = parser.parse_args()
    
    # Run training
    training_client, sampling_client, tokenizer = train_model(
        json_path=args.json_path,
        base_model=args.base_model,
        batch_size=args.batch_size,
        num_epochs=args.epochs,
        learning_rate=args.learning_rate,
        max_examples=args.max_examples,
        visualize_first_example=not args.no_visualize
    )
    
    # Sample if requested
    if args.sample:
        default_prompt = (
            "Here are real world examples of medical case studies where a "
            "primary active failures has occured: ${example}. , write a "
            "similar medical case studie that is tailored towards a "
            "${role} specializing in ${specialization} working in the "
            "${department} department and that includes a primary active "
            "failure that has occured in the scenario"
        )
        prompt = args.sample_prompt if args.sample_prompt else default_prompt
        
        sample_from_model(
            sampling_client,
            tokenizer,
            prompt,
            max_tokens=200,
            temperature=0.7,
            num_samples=4
        )


if __name__ == "__main__":
    main()

