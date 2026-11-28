// Mask-derived isosurface, standard Marching Cubes at binary threshold 0.5.
// File-axis voxel indices only. No anatomy completion, smoothing or registration.
#include <algorithm>
#include <array>
#include <cassert>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>
#include "tri_table.h"
using namespace std;
constexpr int Z=774,Y=330,X=573;
constexpr size_t N=size_t(Z)*Y*X;
struct Target {int index;vector<int> labels;uint64_t count=0;array<int,3> lo={Z,Y,X},hi={-1,-1,-1};};
const int corner[8][3]={{0,0,0},{0,0,1},{0,1,1},{0,1,0},{1,0,0},{1,0,1},{1,1,1},{1,1,0}};
const int edge[12][2]={{0,1},{1,2},{2,3},{3,0},{4,5},{5,6},{6,7},{7,4},{0,4},{1,5},{2,6},{3,7}};
size_t idx(int z,int y,int x){return (size_t(z)*Y+y)*X+x;}
int main(int argc,char**argv){try{
 if(argc!=4)throw runtime_error("volume plan output-dir");
 static_assert(sizeof(float)==4&&numeric_limits<float>::is_iec559,"float32 required");
 vector<uint16_t> volume(N);ifstream in(argv[1],ios::binary);in.read((char*)volume.data(),N*2);if(in.gcount()!=N*2||in.peek()!=EOF)throw runtime_error("volume shape mismatch");
 vector<Target> targets;ifstream plan(argv[2]);int i,n;while(plan>>i>>n){Target t;t.index=i;while(n--){int l;plan>>l;if(l<=0||l>=65536)throw runtime_error("label range");t.labels.push_back(l);}targets.push_back(t);}if(targets.size()!=33)throw runtime_error("target count");
 array<uint64_t,65536> bits{},counts{};for(size_t t=0;t<targets.size();t++)for(int l:targets[t].labels)bits[l]|=uint64_t(1)<<t;
 for(int z=0;z<Z;z++)for(int y=0;y<Y;y++)for(int x=0;x<X;x++){
  auto value=volume[idx(z,y,x)];counts[value]++;auto b=bits[value];while(b){int k=__builtin_ctzll(b);b&=b-1;auto&t=targets[k];t.count++;for(int a=0;a<3;a++){int p=a==0?z:a==1?y:x;t.lo[a]=min(t.lo[a],p);t.hi[a]=max(t.hi[a],p);}}
 }
 ofstream cnt(string(argv[3])+"/voxel-counts.json");cnt<<"{";bool first=true;int nonzero=0;for(int l=0;l<65536;l++)if(counts[l]){if(!first)cnt<<",";first=false;cnt<<"\""<<l<<"\":"<<counts[l];if(l)nonzero++;}cnt<<"}\n";if(nonzero!=336)throw runtime_error("nonzero label count differs");
 for(size_t ti=0;ti<targets.size();ti++){
  auto&t=targets[ti];if(!t.count)throw runtime_error("empty mask");uint64_t flag=uint64_t(1)<<ti;
  vector<float> vertices;vector<uint32_t> faces;unordered_map<uint64_t,uint32_t> cache;
  int zlo=max(0,t.lo[0]-1),zhi=min(Z-2,t.hi[0]),ylo=max(0,t.lo[1]-1),yhi=min(Y-2,t.hi[1]),xlo=max(0,t.lo[2]-1),xhi=min(X-2,t.hi[2]);
  for(int z=zlo;z<=zhi;z++)for(int y=ylo;y<=yhi;y++)for(int x=xlo;x<=xhi;x++){
   uint32_t ids[8];int ci=0;for(int k=0;k<8;k++){ids[k]=idx(z+corner[k][0],y+corner[k][1],x+corner[k][2]);if(bits[volume[ids[k]]]&flag)ci|=1<<k;}
   if(ci==0||ci==255)continue;
   for(int j=0;j<16&&triTable[ci*16+j]>=0;j++){
    int e=triTable[ci*16+j],c0=edge[e][0],c1=edge[e][1];uint32_t a=ids[c0],b=ids[c1];if(a>b)swap(a,b);uint64_t key=(uint64_t(a)<<32)|b;auto it=cache.find(key);uint32_t vi;
    if(it!=cache.end())vi=it->second;else{
     vi=vertices.size()/3;cache.emplace(key,vi);
     vertices.push_back(float(z)+(corner[c0][0]+corner[c1][0])*0.5f);
     vertices.push_back(float(y)+(corner[c0][1]+corner[c1][1])*0.5f);
     vertices.push_back(float(x)+(corner[c0][2]+corner[c1][2])*0.5f);
    }faces.push_back(vi);
   }
   if(vertices.size()>30000000||faces.size()>60000000)throw runtime_error("source mesh budget exceeded");
  }
  if(vertices.empty()||faces.empty()||faces.size()%3)throw runtime_error("invalid mesh");
  // Indexing by occupied/high voxels gives inward XYZ winding; the ZYX
  // output permutation reverses it. Do not reverse twice. Verified on closed
  // rectangular-mask fixtures by positive signed volume and edge incidence.
  uint32_t nv=vertices.size()/3,nf=faces.size()/3;string base=string(argv[3])+"/target-"+to_string(t.index);
  ofstream out(base+".mesh",ios::binary);out.write((char*)&nv,4);out.write((char*)&nf,4);out.write((char*)vertices.data(),vertices.size()*4);out.write((char*)faces.data(),faces.size()*4);out.close();if(!out)throw runtime_error("write failed");
  bool boundary=t.lo[0]==0||t.lo[1]==0||t.lo[2]==0||t.hi[0]==Z-1||t.hi[1]==Y-1||t.hi[2]==X-1;
  ofstream meta(base+".json");meta<<"{\"index\":"<<t.index<<",\"voxels\":"<<t.count<<",\"vertices\":"<<nv<<",\"triangles\":"<<nf<<",\"touchesSourceVolumeBoundary\":"<<(boundary?"true":"false")<<",\"voxelBoundsZYX\":[["<<t.lo[0]<<","<<t.lo[1]<<","<<t.lo[2]<<"],["<<t.hi[0]<<","<<t.hi[1]<<","<<t.hi[2]<<"]]}\n";
  cout<<"MESH "<<t.index<<" voxels="<<t.count<<" vertices="<<nv<<" triangles="<<nf<<" boundary="<<boundary<<endl;
 }
 return 0;
 }catch(const exception&e){cerr<<"FAIL "<<e.what()<<endl;return 2;}}
