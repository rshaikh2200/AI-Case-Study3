#!/usr/bin/env python3
"""
Merge LoRA adapter with base model and upload merged model to Hugging Face Hub
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from huggingface_hub import HfApi, login, snapshot_download
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoConfig
from peft import PeftModel, PeftConfig
import torch

# Load environment variables from .env file
load_dotenv()


def is_jupyter_notebook():
    """
    Check if we're running in a Jupyter notebook environment.
    """
    try:
        from IPython import get_ipython
        if get_ipython() is not None:
            return True
    except (ImportError, NameError, AttributeError):
        pass
    return False


def download_from_huggingface(repo_id="rshaikh22/Qwen3_30B_Medical", local_dir=None, hf_token=None):
    """
    Download adapter files from Hugging Face repository.
    
    Args:
        repo_id: Hugging Face repository ID (default: "rshaikh22/Qwen3_30B_Medical")
        local_dir: Local directory to download files to (default: workspace/archive)
        hf_token: Hugging Face token (if None, will try to get from env)
    
    Returns:
        Path to local directory containing downloaded files, or None if failed
    """
    if local_dir is None:
        local_dir = Path.cwd() / "archive"
    else:
        local_dir = Path(local_dir)
    
    local_dir.mkdir(parents=True, exist_ok=True)
    
    # Get Hugging Face token
    if not hf_token:
        hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
    
    print(f"\nConnecting to Hugging Face...")
    print(f"Repository: {repo_id}")
    print(f"Downloading to: {local_dir.absolute()}")
    
    try:
        from huggingface_hub import hf_hub_download
        
        # Files to download
        required_files = ['adapter_config.json', 'adapter_model.safetensors', 'checkpoint_complete']
        downloaded_files = []
        
        for file_name in required_files:
            local_file_path = local_dir / file_name
            
            # Check if file already exists
            if local_file_path.exists():
                file_size = local_file_path.stat().st_size
                print(f"✓ {file_name} already exists ({file_size / (1024*1024):.2f} MB)")
                downloaded_files.append(file_name)
                continue
            
            try:
                print(f"Downloading {file_name}...")
                downloaded_path = hf_hub_download(
                    repo_id=repo_id,
                    filename=file_name,
                    local_dir=str(local_dir),
                    token=hf_token,
                    local_dir_use_symlinks=False  # Copy files instead of symlinking
                )
                
                # Verify download
                if Path(downloaded_path).exists():
                    file_size = Path(downloaded_path).stat().st_size
                    print(f"✓ Downloaded {file_name} ({file_size / (1024*1024):.2f} MB)")
                    downloaded_files.append(file_name)
                else:
                    print(f"⚠️  Warning: {file_name} download may have failed")
                    
            except Exception as e:
                error_msg = str(e)
                if "404" in error_msg or "not found" in error_msg.lower():
                    print(f"⚠️  Warning: {file_name} not found in repository (may be optional)")
                else:
                    print(f"⚠️  Warning: Could not download {file_name}: {e}")
        
        # Check if essential files were downloaded
        essential_files = ['adapter_config.json', 'adapter_model.safetensors']
        missing_essential = set(essential_files) - set(downloaded_files)
        
        if missing_essential:
            print(f"❌ Error: Missing essential files: {missing_essential}")
            return None
        
        print(f"✓ Files downloaded to: {local_dir.absolute()}")
        print(f"  Downloaded: {downloaded_files}")
        return str(local_dir)
        
    except Exception as e:
        print(f"❌ Error accessing Hugging Face: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_default_adapter_path(hf_repo_id="rshaikh22/Qwen3_30B_Medical", hf_token=None):
    """
    Get the default adapter path based on the environment.
    Downloads from Hugging Face if files don't exist locally.
    """
    # Always check workspace first (works in both Jupyter and regular Python)
    workspace_path = Path.cwd() / "archive"
    if workspace_path.exists() and (workspace_path / "adapter_config.json").exists():
        print(f"✓ Found adapter files in workspace: {workspace_path}")
        return str(workspace_path)
    
    # Try to download from Hugging Face
    print(f"\nAdapter files not found locally. Downloading from Hugging Face...")
    hf_path = download_from_huggingface(
        repo_id=hf_repo_id,
        local_dir=str(workspace_path),
        hf_token=hf_token
    )
    if hf_path:
        return hf_path
    
    # If download failed, still return workspace path (will error later if files missing)
    if is_jupyter_notebook():
        return str(workspace_path)
    
    # Not in Jupyter - try Downloads directory
    downloads_path = Path.home() / "Downloads" / "archive"
    if downloads_path.exists():
        return str(downloads_path)
    
    # Fallback: return workspace path
    return str(workspace_path)


def merge_adapter_with_base_model(
    adapter_path: str,
    base_model: str = "Qwen/Qwen3-30B-A3B-Instruct-2507",
    output_dir: str = "./merged_model",
    hf_repo_id: str = "rshaikh22/Qwen3_30B_Medical",
    hf_token: str = None,
    device_map: str = "auto"
):
    """
    Merge LoRA adapter with base model and upload to Hugging Face.
    
    Args:
        adapter_path: Path to the LoRA adapter directory (contains adapter_model.bin and adapter_config.json)
        base_model: Base model name from Hugging Face
        output_dir: Local directory to save merged model
        hf_repo_id: Hugging Face repository ID to upload merged model
        hf_token: Hugging Face token (if None, will try to get from env)
        device_map: Device mapping for model loading (default: "auto")
    """
    # Get Hugging Face token
    if not hf_token:
        hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
        if not hf_token:
            print("Hugging Face token not found in environment variables.")
            hf_token = input("Please enter your Hugging Face token: ").strip()
            if not hf_token:
                raise ValueError("Hugging Face token is required to upload models.")
    
    # Login to Hugging Face
    print("="*70)
    print("Logging in to Hugging Face...")
    print("="*70)
    try:
        login(token=hf_token)
        print("✓ Successfully logged in to Hugging Face")
    except Exception as e:
        raise ValueError(f"Failed to login to Hugging Face: {e}")
    
    adapter_dir = Path(adapter_path)
    # Convert to absolute path for better error messages
    adapter_dir = adapter_dir.resolve() if adapter_dir.exists() else adapter_dir.absolute()
    
    if not adapter_dir.exists():
        # Provide helpful error message with suggestions
        current_dir = Path.cwd()
        workspace_archive = current_dir / "archive"
        error_msg = f"Adapter path does not exist: {adapter_dir}\n"
        error_msg += f"Current working directory: {current_dir}\n"
        if is_jupyter_notebook():
            error_msg += f"Jupyter notebook detected. Expected archive folder at: {workspace_archive}\n"
            if workspace_archive.exists():
                error_msg += f"Note: Found archive at {workspace_archive}, but was looking at {adapter_dir}"
            else:
                error_msg += f"Please ensure the 'archive' folder exists in your workspace directory."
        else:
            error_msg += f"Please check if the archive folder exists at the specified path."
        raise ValueError(error_msg)
    
    # Check for adapter files
    adapter_model_path = adapter_dir / "adapter_model.bin"
    adapter_config_path = adapter_dir / "adapter_config.json"
    
    if not adapter_config_path.exists():
        raise ValueError(f"adapter_config.json not found in {adapter_path}")
    
    print("\n" + "="*70)
    print("Loading LoRA Adapter Configuration")
    print("="*70)
    print(f"Adapter path: {adapter_dir.absolute()}")
    
    # Load adapter config to get base model info
    import json
    with open(adapter_config_path, 'r') as f:
        adapter_config = json.load(f)
    
    # Use base_model from config if available, otherwise use provided base_model
    if "base_model_name_or_path" in adapter_config:
        base_model_from_config = adapter_config["base_model_name_or_path"]
        print(f"Base model from adapter config: {base_model_from_config}")
        if base_model != base_model_from_config:
            print(f"Note: Using provided base_model '{base_model}' instead of config's '{base_model_from_config}'")
    
    print(f"Using base model: {base_model}")
    
    # Determine base model path - download to workspace in Jupyter
    base_model_path = None
    if is_jupyter_notebook():
        # In Jupyter: download to workspace/base_model directory
        workspace_base_model_dir = Path.cwd() / "base_model"
        workspace_base_model_dir.mkdir(exist_ok=True)
        base_model_path = str(workspace_base_model_dir)
        print(f"\nJupyter notebook detected: Base model will be downloaded to workspace")
        print(f"Base model directory: {workspace_base_model_dir.absolute()}")
        
        # Check if model already exists locally
        has_config = (workspace_base_model_dir / "config.json").exists()
        has_tokenizer = (workspace_base_model_dir / "tokenizer.json").exists() or (workspace_base_model_dir / "tokenizer_config.json").exists()
        
        if has_config or has_tokenizer:
            print("✓ Base model files found in workspace, will use local copy")
        else:
            print("Base model not found locally, downloading from Hugging Face...")
            print("This may take a while for large models...")
            try:
                # Download the entire model repository to the workspace directory
                print(f"Downloading to: {workspace_base_model_dir.absolute()}")
                snapshot_download(
                    repo_id=base_model,
                    local_dir=base_model_path,
                    token=hf_token,
                    local_dir_use_symlinks=False,  # Copy files instead of symlinking
                    resume_download=True  # Resume if interrupted
                )
                # Verify download completed
                if not (workspace_base_model_dir / "config.json").exists():
                    raise RuntimeError("Download completed but config.json not found. Download may be incomplete.")
                print(f"✓ Base model downloaded to: {workspace_base_model_dir.absolute()}")
                # List downloaded files
                downloaded_files = list(workspace_base_model_dir.glob("*"))
                print(f"  Downloaded {len(downloaded_files)} files/directories")
            except Exception as e:
                print(f"Error: Could not download model to workspace: {e}")
                import traceback
                traceback.print_exc()
                print("Will try to load from Hugging Face cache or download on-the-fly...")
                base_model_path = None
    
    # Load base model
    print("\n" + "="*70)
    if base_model_path:
        print("Loading Base Model from Workspace")
        print("="*70)
        print(f"Loading from: {base_model_path}")
    else:
        print("Loading Base Model from Hugging Face")
        print("="*70)
        print(f"Loading {base_model}...")
    print("This may take a while for large models...")
    
    try:
        # Determine which path to use for loading
        model_load_path = base_model_path if base_model_path else base_model
        
        # If we have a local path, verify it exists and use local_files_only
        use_local_only = False
        if base_model_path:
            local_path = Path(base_model_path)
            if local_path.exists() and (local_path / "config.json").exists():
                use_local_only = True
                print(f"Using local model files from: {local_path.absolute()}")
            else:
                print(f"Warning: Local path exists but config.json not found. Will download if needed.")
        
        # Load tokenizer first
        print("\nLoading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(
            model_load_path,
            trust_remote_code=True,
            token=hf_token if not use_local_only else None,
            local_files_only=use_local_only
        )
        print("✓ Tokenizer loaded")
        
        # Load base model
        print("\nLoading base model...")
        base_model_obj = AutoModelForCausalLM.from_pretrained(
            model_load_path,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map=device_map,
            trust_remote_code=True,
            token=hf_token if not use_local_only else None,
            local_files_only=use_local_only
        )
        print("✓ Base model loaded")
        
        if base_model_path:
            actual_path = Path(base_model_path).absolute()
            print(f"  Model location: {actual_path}")
            # Verify files are actually in workspace
            if actual_path.exists():
                files_count = len(list(actual_path.rglob("*")))
                print(f"  Files in workspace directory: {files_count}")
        
    except Exception as e:
        raise RuntimeError(f"Failed to load base model: {e}")
    
    # Load LoRA adapter
    print("\n" + "="*70)
    print("Loading LoRA Adapter")
    print("="*70)
    
    # Find adapter files
    adapter_files = list(adapter_dir.glob("*.bin"))
    adapter_files.extend(list(adapter_dir.glob("*.safetensors")))
    
    if not adapter_files:
        raise ValueError(f"No adapter weight files found in {adapter_path}")
    
    # Verify safetensors files before loading
    safetensors_files = [f for f in adapter_files if f.suffix == ".safetensors"]
    if safetensors_files:
        print(f"\nVerifying safetensors file(s)...")
        for safetensors_file in safetensors_files:
            file_size = safetensors_file.stat().st_size
            file_size_mb = file_size / (1024*1024)
            print(f"File: {safetensors_file.name} ({file_size_mb:.2f} MB)")
            
            # Expected size check - warn if file seems too small
            # For a 30B model LoRA adapter, expect ~900-950 MB
            expected_min_size_mb = 800  # Minimum expected size in MB
            if file_size_mb < expected_min_size_mb:
                print(f"⚠️  WARNING: File size ({file_size_mb:.2f} MB) is smaller than expected (~934 MB)")
                print(f"   This suggests the file may be incomplete or truncated.")
            
            # Check if file is suspiciously small
            if file_size < 1024:  # Less than 1KB is definitely wrong
                raise ValueError(
                    f"Safetensors file appears corrupted (size: {file_size} bytes). "
                    f"Please re-download the checkpoint."
                )
            
            # Verify file integrity by checking the header structure
            try:
                import struct
                with open(safetensors_file, 'rb') as f:
                    # Read header length (first 8 bytes)
                    header_len_bytes = f.read(8)
                    if len(header_len_bytes) < 8:
                        raise ValueError("File is too small to contain valid header")
                    
                    header_len = struct.unpack('<Q', header_len_bytes)[0]
                    
                    # Read the JSON header
                    header_json_bytes = f.read(header_len)
                    if len(header_json_bytes) < header_len:
                        raise ValueError(
                            f"File is truncated. Header indicates {header_len} bytes, "
                            f"but only {len(header_json_bytes)} bytes available. "
                            f"File appears incomplete."
                        )
                    
                    # Check if we can read the expected data size from header
                    import json
                    header_dict = json.loads(header_json_bytes.decode('utf-8'))
                    
                    # Calculate expected total file size
                    # File size = 8 (header length) + header_len + data_size
                    max_data_offset = 0
                    for tensor_info in header_dict.values():
                        if 'data_offsets' in tensor_info:
                            max_data_offset = max(max_data_offset, tensor_info['data_offsets'][1])
                    
                    expected_file_size = 8 + header_len + max_data_offset
                    current_file_size = safetensors_file.stat().st_size
                    
                    if current_file_size < expected_file_size:
                        missing_bytes = expected_file_size - current_file_size
                        missing_mb = missing_bytes / (1024*1024)
                        raise ValueError(
                            f"File is incomplete!\n"
                            f"  Current size: {current_file_size / (1024*1024):.2f} MB\n"
                            f"  Expected size: {expected_file_size / (1024*1024):.2f} MB\n"
                            f"  Missing: {missing_mb:.2f} MB\n\n"
                            f"The file was truncated during transfer. Please:\n"
                            f"  1. Delete the incomplete file: {safetensors_file}\n"
                            f"  2. Re-copy or re-download the complete file\n"
                            f"  3. Verify the source file is complete (should be ~934 MB)"
                        )
                    
                    print(f"✓ File size verification passed")
                    print(f"  Expected size: {expected_file_size / (1024*1024):.2f} MB")
                    print(f"  Actual size: {current_file_size / (1024*1024):.2f} MB")
                    
            except (ValueError, struct.error, json.JSONDecodeError) as e:
                error_msg = str(e)
                if "truncated" in error_msg.lower() or "incomplete" in error_msg.lower():
                    raise ValueError(error_msg)
                # If header check fails, try the safetensors library check
                pass
            
            # Try to verify the file can be opened with safetensors library
            try:
                from safetensors import safe_open
                with safe_open(str(safetensors_file), framework="pt") as f:
                    keys = list(f.keys())
                    print(f"✓ Safetensors file is valid ({len(keys)} tensors found)")
                    if len(keys) > 0:
                        print(f"  Sample keys: {keys[:3]}...")
            except Exception as e:
                error_msg = str(e)
                if "incomplete metadata" in error_msg or "not fully covered" in error_msg:
                    raise ValueError(
                        f"Safetensors file is corrupted or incomplete: {error_msg}\n"
                        f"File: {safetensors_file}\n"
                        f"File size: {file_size} bytes ({file_size / (1024*1024):.2f} MB)\n"
                        f"Expected size: ~934 MB\n\n"
                        f"The file is only {file_size_mb:.2f} MB but should be ~934 MB.\n"
                        f"This means the file transfer was incomplete.\n\n"
                        f"Solutions:\n"
                        f"  1. Delete the incomplete file and re-copy it completely\n"
                        f"  2. Use a reliable transfer method (rsync, scp, or direct download)\n"
                        f"  3. Verify the source file is complete before copying\n"
                        f"  4. Check disk space in the workspace directory\n"
                        f"  5. If using file upload, ensure the upload completed fully"
                    )
                else:
                    print(f"⚠️  Warning: Could not verify safetensors file: {e}")
                    print("Attempting to load anyway...")
    
    try:
        print(f"\nLoading adapter from: {adapter_dir}")
        model = PeftModel.from_pretrained(
            base_model_obj,
            str(adapter_dir),
            token=hf_token
        )
        print("✓ LoRA adapter loaded")
        
    except Exception as e:
        error_msg = str(e)
        if "incomplete metadata" in error_msg or "not fully covered" in error_msg:
            raise RuntimeError(
                f"Failed to load LoRA adapter: {error_msg}\n\n"
                f"The safetensors file appears to be corrupted or incomplete.\n"
                f"Please:\n"
                f"  1. Re-download the adapter files from the source\n"
                f"  2. Re-extract if using an archive\n"
                f"  3. Verify the file size matches the expected size\n"
                f"  4. Check disk space and file permissions"
            )
        else:
            raise RuntimeError(f"Failed to load LoRA adapter: {e}")
    
    # Merge adapter with base model
    print("\n" + "="*70)
    print("Merging LoRA Adapter with Base Model")
    print("="*70)
    print("Merging adapter weights into base model...")
    print("This may take a while...")
    
    try:
        merged_model = model.merge_and_unload()
        print("✓ Adapter merged successfully")
    except Exception as e:
        raise RuntimeError(f"Failed to merge adapter: {e}")
    
    # Save merged model locally
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    print("\n" + "="*70)
    print("Saving Merged Model Locally")
    print("="*70)
    print(f"Saving to: {output_path.absolute()}")
    
    try:
        # Save model
        print("Saving model...")
        merged_model.save_pretrained(
            str(output_path),
            safe_serialization=True  # Use safetensors format
        )
        print("✓ Model saved")
        
        # Save tokenizer
        print("Saving tokenizer...")
        tokenizer.save_pretrained(str(output_path))
        print("✓ Tokenizer saved")
        
        # Save config
        print("Saving model config...")
        config = AutoConfig.from_pretrained(base_model, trust_remote_code=True)
        config.save_pretrained(str(output_path))
        print("✓ Config saved")
        
        # Create README.md
        readme_content = f"""---
library_name: transformers
license: apache-2.0
base_model: {base_model}
tags:
- medical
- case-studies
- japanese
- qwen
- merged
---

# {hf_repo_id}

This is a merged model combining {base_model} with a LoRA adapter fine-tuned on Japanese medical case studies.

## Model Details

- **Base Model**: {base_model}
- **Training Data**: Japanese medical case studies (~93,563 examples)
- **Fine-tuning Method**: LoRA (Low-Rank Adaptation) - Merged
- **Model Type**: Merged Causal LM (no adapter needed)

## Usage

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained("{hf_repo_id}", trust_remote_code=True)
tokenizer = AutoTokenizer.from_pretrained("{hf_repo_id}", trust_remote_code=True)

# Use the model
prompt = "Your prompt here"
inputs = tokenizer(prompt, return_tensors="pt")
outputs = model.generate(**inputs, max_length=200)
print(tokenizer.decode(outputs[0]))
```

## Training Details

- **Epochs**: 2
- **Learning Rate**: 5e-4
- **Batch Size**: 24
- **Training Examples**: ~93,563
"""
        
        readme_path = output_path / "README.md"
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        print("✓ README.md created")
        
    except Exception as e:
        raise RuntimeError(f"Failed to save merged model: {e}")
    
    # Upload to Hugging Face
    print("\n" + "="*70)
    print(f"Uploading Merged Model to Hugging Face")
    print("="*70)
    print(f"Repository: {hf_repo_id}")
    
    try:
        api = HfApi()
        
        # Create repo if it doesn't exist
        try:
            api.create_repo(repo_id=hf_repo_id, exist_ok=True, private=False)
            print(f"✓ Repository ready: {hf_repo_id}")
        except Exception as e:
            print(f"Warning: Could not create/verify repo: {e}")
        
        # Upload all files
        print("\nUploading files...")
        api.upload_folder(
            folder_path=str(output_path),
            repo_id=hf_repo_id,
            repo_type="model",
            ignore_patterns=["*.pyc", "__pycache__", ".git"]
        )
        print(f"\n✓ Successfully uploaded merged model to: https://huggingface.co/{hf_repo_id}")
        
    except Exception as e:
        print(f"\nError uploading to Hugging Face: {e}")
        print(f"\nMerged model files are saved locally at: {output_path}")
        print("You can manually upload them using:")
        print(f"  huggingface-cli upload {hf_repo_id} {output_path}")
        raise
    
    print("\n" + "="*70)
    print("Merge and Upload Completed Successfully!")
    print("="*70)
    print(f"Merged model available at: https://huggingface.co/{hf_repo_id}")
    print(f"Local files saved at: {output_path}")


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Merge LoRA adapter with base model and upload to Hugging Face"
    )
    parser.add_argument(
        "--adapter-path",
        type=str,
        default=None,
        help="Path to LoRA adapter directory (contains adapter_model.bin and adapter_config.json). Default: Downloads from Hugging Face repo rshaikh22/Qwen3_30B_Medical to workspace/archive"
    )
    parser.add_argument(
        "--hf-adapter-repo",
        type=str,
        default="rshaikh22/Qwen3_30B_Medical",
        help="Hugging Face repository ID to download adapter files from (default: rshaikh22/Qwen3_30B_Medical)"
    )
    parser.add_argument(
        "--base-model",
        type=str,
        default="Qwen/Qwen3-30B-A3B-Instruct-2507",
        help="Base model name from Hugging Face"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./merged_model",
        help="Local directory to save merged model"
    )
    parser.add_argument(
        "--hf-repo",
        type=str,
        default="rshaikh22/Qwen3_30B_Medical",
        help="Hugging Face repository ID to upload merged model"
    )
    parser.add_argument(
        "--hf-token",
        type=str,
        default=None,
        help="Hugging Face token (or set HF_TOKEN env var)"
    )
    parser.add_argument(
        "--device-map",
        type=str,
        default="auto",
        help="Device mapping for model loading (default: auto)"
    )
    
    args = parser.parse_args()
    
    # Set default adapter path if not provided (determine at runtime)
    if args.adapter_path is None:
        # Get HF token early for downloading adapter files
        hf_token_for_download = args.hf_token or os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
        args.adapter_path = get_default_adapter_path(
            hf_repo_id=args.hf_adapter_repo,
            hf_token=hf_token_for_download
        )
        print(f"Using adapter path: {args.adapter_path}")
        print(f"Absolute path: {Path(args.adapter_path).absolute()}")
        print(f"Path exists: {Path(args.adapter_path).exists()}")
    
    try:
        merge_adapter_with_base_model(
            adapter_path=args.adapter_path,
            base_model=args.base_model,
            output_dir=args.output_dir,
            hf_repo_id=args.hf_repo,
            hf_token=args.hf_token,
            device_map=args.device_map
        )
    except Exception as e:
        print(f"\n❌ Merge and upload failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

